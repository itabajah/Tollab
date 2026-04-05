/**
 * Hook that manages the Firebase sync lifecycle.
 *
 * Provides:
 *   - isSignedIn, user, syncStatus, lastSyncTime  (read-only state)
 *   - signIn, signOut, forceSyncNow                (actions)
 *
 * Wires firebase-auth and firebase-sync services to the Preact UI, handles
 * conflict detection (triggers SyncConflictModal via onConflict callback),
 * and debounced auto-sync on data changes.
 *
 * Handles offline gracefully — no crashes if Firebase is unavailable.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { User } from 'firebase/auth';

import { isFirebaseConfigured } from '@/services/firebase-config';
import {
  signOut as firebaseSignOut,
  initAuth,
  signInWithGoogle,
} from '@/services/firebase-auth';
import {
  type AppData,
  buildLocalPayload,
  cancelPendingSync,
  debouncedSync,
  mergeLocalAndCloud,
  pullFromFirebase,
  pushToFirebase,
  subscribeToFirebase,
} from '@/services/firebase-sync';
import type {
  CloudPayload,
  SyncConflictInfo,
  SyncConflictResolution,
} from '@/types';
import { FirebaseSyncState } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface UseFirebaseSyncOptions {
  /** Read current app data for building payloads. */
  getAppData: () => AppData;
  /** Apply a cloud payload to local state. */
  applyCloudPayload: (payload: CloudPayload) => void;
  /**
   * Called when a conflict is detected. Must return a Promise that resolves
   * to the user's choice, or null if they cancelled.
   */
  onConflict: (info: SyncConflictInfo) => Promise<SyncConflictResolution | null>;
}

export interface UseFirebaseSyncReturn {
  isSignedIn: boolean;
  user: User | null;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  syncState: FirebaseSyncState;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  forceSyncNow: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOG = '[useFirebaseSync]';

function getLatestModified(payload: CloudPayload): string | null {
  let latest: string | null = null;
  for (const p of payload.profiles) {
    if (p.lastModified && (!latest || p.lastModified > latest)) {
      latest = p.lastModified;
    }
  }
  return latest;
}

function buildConflictInfo(
  local: CloudPayload,
  cloud: CloudPayload,
): SyncConflictInfo {
  return {
    localProfileCount: local.profiles.length,
    cloudProfileCount: cloud.profiles.length,
    localLastModified: getLatestModified(local),
    cloudLastModified: getLatestModified(cloud),
  };
}

/** Determine whether cloud and local payloads differ enough to warrant a conflict dialog. */
function hasConflict(local: CloudPayload, cloud: CloudPayload): boolean {
  if (local.profiles.length !== cloud.profiles.length) return true;

  const localIds = new Set(local.profiles.map((p) => p.id));
  const cloudIds = new Set(cloud.profiles.map((p) => p.id));
  if (localIds.size !== cloudIds.size) return true;

  for (const id of localIds) {
    if (!cloudIds.has(id)) return true;
  }

  // Check if any matching profile has a different lastModified
  for (const lp of local.profiles) {
    const cp = cloud.profiles.find((p) => p.id === lp.id);
    if (cp && lp.lastModified !== cp.lastModified) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFirebaseSync({
  getAppData,
  applyCloudPayload,
  onConflict,
}: UseFirebaseSyncOptions): UseFirebaseSyncReturn {
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncState, setSyncState] = useState<FirebaseSyncState>(
    FirebaseSyncState.Disconnected,
  );

  // Refs to avoid stale closures
  const getAppDataRef = useRef(getAppData);
  const applyCloudPayloadRef = useRef(applyCloudPayload);
  const onConflictRef = useRef(onConflict);
  const unsubDbRef = useRef<(() => void) | null>(null);

  useEffect(() => { getAppDataRef.current = getAppData; }, [getAppData]);
  useEffect(() => { applyCloudPayloadRef.current = applyCloudPayload; }, [applyCloudPayload]);
  useEffect(() => { onConflictRef.current = onConflict; }, [onConflict]);

  // ----- Auth state listener -----------------------------------------------
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsub = initAuth((u) => {
      setUser(u);
      if (!u) {
        setSyncState(FirebaseSyncState.Disconnected);
        setSyncStatus('idle');
        // Tear down realtime listener
        unsubDbRef.current?.();
        unsubDbRef.current = null;
        cancelPendingSync();
      }
    });

    return () => {
      unsub?.();
      unsubDbRef.current?.();
      unsubDbRef.current = null;
      cancelPendingSync();
    };
  }, []);

  // ----- Initial sync on sign-in -------------------------------------------
  const handleInitialSync = useCallback(async (uid: string) => {
    setSyncStatus('syncing');
    setSyncState(FirebaseSyncState.Syncing);

    try {
      const cloudPayload = await pullFromFirebase(uid);
      const localPayload = buildLocalPayload(getAppDataRef.current());

      if (!cloudPayload) {
        // No cloud data — push local
        await pushToFirebase(uid, localPayload);
      } else if (hasConflict(localPayload, cloudPayload)) {
        // Conflict detected — ask user
        const info = buildConflictInfo(localPayload, cloudPayload);
        const choice = await onConflictRef.current(info);

        if (choice === 'use_cloud') {
          applyCloudPayloadRef.current(cloudPayload);
        } else if (choice === 'use_local') {
          await pushToFirebase(uid, localPayload);
        } else if (choice === 'merge') {
          const merged = mergeLocalAndCloud(localPayload, cloudPayload);
          applyCloudPayloadRef.current(merged);
          await pushToFirebase(uid, merged);
        }
        // null (cancel) — do nothing, keep local
      } else {
        // Data matches — no action needed
      }

      setSyncStatus('idle');
      setSyncState(FirebaseSyncState.Synced);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error(LOG, 'Initial sync failed:', err);
      setSyncStatus('error');
      setSyncState(FirebaseSyncState.Error);
    }
  }, []);

  // ----- Set up realtime listener after initial sync -----------------------
  const setupRealtimeListener = useCallback((uid: string) => {
    unsubDbRef.current?.();

    const unsub = subscribeToFirebase(uid, (payload) => {
      console.debug(LOG, 'Remote update received');
      applyCloudPayloadRef.current(payload);
      setLastSyncTime(new Date());
      setSyncState(FirebaseSyncState.Synced);
    });

    unsubDbRef.current = unsub;
  }, []);

  // ----- Sign in -----------------------------------------------------------
  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured) {
      console.warn(LOG, 'Firebase not configured');
      return;
    }

    setSyncStatus('syncing');
    setSyncState(FirebaseSyncState.Syncing);

    try {
      const u = await signInWithGoogle();
      if (!u) {
        setSyncStatus('idle');
        setSyncState(FirebaseSyncState.Disconnected);
        return;
      }

      // setUser will be called by the auth state listener
      await handleInitialSync(u.uid);
      setupRealtimeListener(u.uid);
    } catch (err) {
      console.error(LOG, 'Sign-in failed:', err);
      setSyncStatus('error');
      setSyncState(FirebaseSyncState.Error);
    }
  }, [handleInitialSync, setupRealtimeListener]);

  // ----- Sign out ----------------------------------------------------------
  const signOut = useCallback(async () => {
    try {
      cancelPendingSync();
      unsubDbRef.current?.();
      unsubDbRef.current = null;
      await firebaseSignOut();
      // setUser(null) will be called by the auth state listener
      setSyncState(FirebaseSyncState.Disconnected);
      setSyncStatus('idle');
      setLastSyncTime(null);
    } catch (err) {
      console.error(LOG, 'Sign-out failed:', err);
    }
  }, []);

  // ----- Force sync now ----------------------------------------------------
  const forceSyncNow = useCallback(async () => {
    if (!user) return;

    setSyncStatus('syncing');
    setSyncState(FirebaseSyncState.Syncing);

    try {
      const payload = buildLocalPayload(getAppDataRef.current());
      await pushToFirebase(user.uid, payload);
      setSyncStatus('idle');
      setSyncState(FirebaseSyncState.Synced);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error(LOG, 'Force sync failed:', err);
      setSyncStatus('error');
      setSyncState(FirebaseSyncState.Error);
    }
  }, [user]);

  // ----- Debounced auto-sync on data changes --------------------------------
  useEffect(() => {
    if (!user) return;

    // Trigger debounced sync whenever this effect re-runs with a signed-in user
    const data = getAppDataRef.current();
    debouncedSync(user.uid, data);
  }, [user]);

  return {
    isSignedIn: user !== null,
    user,
    syncStatus,
    lastSyncTime,
    syncState,
    signIn,
    signOut,
    forceSyncNow,
  };
}
