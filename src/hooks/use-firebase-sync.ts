'use client';

import { useEffect, useCallback, useRef } from 'react';
import { create } from 'zustand';
import {
  signInWithGoogle,
  signOut as firebaseSignOut,
  onAuthChange,
  saveToCloud,
  loadFromCloud,
  subscribeToCloudData,
  mergeData,
  isFirebaseConfigured,
} from '@/lib/firebase';
import { useDataStore, useProfileStore } from '@/stores';
import { FirebaseUser, SyncState } from '@/types';
import { toast } from 'sonner';

interface FirebaseSyncStore extends SyncState {
  setUser: (user: FirebaseUser | null) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSynced: (time: string | null) => void;
  setError: (error: string | null) => void;
}

const useSyncStore = create<FirebaseSyncStore>((set) => ({
  isAuthenticated: false,
  isSyncing: false,
  lastSynced: null,
  error: null,
  user: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSynced: (lastSynced) => set({ lastSynced }),
  setError: (error) => set({ error }),
}));

export const useFirebaseSync = () => {
  const { user, isAuthenticated, isSyncing, lastSynced, error, setUser, setSyncing, setLastSynced, setError } =
    useSyncStore();

  const { data, setData } = useDataStore();
  const { activeProfileId } = useProfileStore();

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize auth listener
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => unsubscribe();
  }, [setUser]);

  // Subscribe to cloud data when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || !activeProfileId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    unsubscribeRef.current = subscribeToCloudData(
      user.uid,
      activeProfileId,
      (cloudData) => {
        if (cloudData) {
          const mergedData = mergeData(data, cloudData);
          if (mergedData !== data) {
            setData(mergedData);
            setLastSynced(new Date().toISOString());
          }
        }
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isAuthenticated, user, activeProfileId, data, setData, setLastSynced]);

  // Auto-sync when data changes (debounced)
  useEffect(() => {
    if (!isAuthenticated || !user || !activeProfileId) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        setSyncing(true);
        await saveToCloud(user.uid, activeProfileId, data);
        setLastSynced(new Date().toISOString());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed');
        console.error('Auto-sync error:', err);
      } finally {
        setSyncing(false);
      }
    }, 2000); // 2 second debounce

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [data, isAuthenticated, user, activeProfileId, setSyncing, setLastSynced, setError]);

  // Sign in
  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      toast.error('Firebase is not configured');
      return;
    }

    try {
      setSyncing(true);
      const firebaseUser = await signInWithGoogle();
      if (firebaseUser) {
        setUser(firebaseUser);
        toast.success(`ברוך הבא, ${firebaseUser.displayName || firebaseUser.email}!`);

        // Load cloud data
        if (activeProfileId) {
          const cloudData = await loadFromCloud(firebaseUser.uid, activeProfileId);
          if (cloudData) {
            const mergedData = mergeData(data, cloudData);
            setData(mergedData);
            setLastSynced(new Date().toISOString());
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      toast.error('התחברות נכשלה');
    } finally {
      setSyncing(false);
    }
  }, [activeProfileId, data, setData, setError, setLastSynced, setSyncing, setUser]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut();
      setUser(null);
      setLastSynced(null);
      toast.success('התנתקת בהצלחה');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      toast.error('התנתקות נכשלה');
    }
  }, [setError, setLastSynced, setUser]);

  // Force sync
  const forceSync = useCallback(async () => {
    if (!isAuthenticated || !user || !activeProfileId) {
      toast.error('יש להתחבר תחילה');
      return;
    }

    try {
      setSyncing(true);
      await saveToCloud(user.uid, activeProfileId, data);
      setLastSynced(new Date().toISOString());
      setError(null);
      toast.success('הנתונים סונכרנו בהצלחה');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      toast.error('סנכרון נכשל');
    } finally {
      setSyncing(false);
    }
  }, [isAuthenticated, user, activeProfileId, data, setSyncing, setLastSynced, setError]);

  return {
    user,
    isAuthenticated,
    isSyncing,
    lastSynced,
    error,
    signIn,
    signOut,
    forceSync,
    isConfigured: isFirebaseConfigured(),
  };
};
