/**
 * Firebase Realtime Database sync service.
 *
 * Handles building cloud payloads, merging local and cloud data, pushing,
 * pulling, realtime subscription with echo prevention, and debounced auto-sync.
 *
 * Uses clean typed interfaces (CloudPayload, CloudProfileEntry) — no compact
 * format, no legacy normalization.
 */

import {
  type DatabaseReference,
  get,
  onValue,
  ref,
  set,
} from 'firebase/database';
import { database } from './firebase-config';
import type {
  CloudPayload,
  CloudProfileEntry,
  Profile,
  ProfileData,
} from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG = '[FirebaseSync]';

/** Cloud payload format version. */
const CLOUD_PAYLOAD_VERSION = 2;

/** Debounce interval for auto-sync (milliseconds). */
const SYNC_DEBOUNCE_MS = 750;

/** localStorage key for persistent client ID. */
const CLIENT_ID_KEY = 'tollab_client';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let clientId: string | null = null;
let lastLocalWriteId: string | null = null;
let isApplyingRemote = false;
let pendingSyncTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** All local data needed to build a cloud payload. */
export interface AppData {
  /** Profile list. */
  profiles: Profile[];
  /** Currently active profile ID. */
  activeProfileId: string;
  /** Full profile data keyed by profile ID. */
  profilesData: Record<string, ProfileData | null>;
}

/** Wrapper record stored in Firebase (includes echo-prevention metadata). */
interface FirebaseRecord {
  version: number;
  updatedAt: string;
  writeId: string;
  clientId: string;
  payload: CloudPayload;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build the Firebase Realtime Database path for a user's data. */
function dbPathForUser(uid: string): string {
  return `tollab/users/${uid}/data`;
}

/** Get (or create) a persistent client ID for echo prevention. */
function ensureClientId(): string {
  if (clientId) return clientId;

  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) {
      clientId = existing;
      return existing;
    }
  } catch {
    // localStorage unavailable — fall through
  }

  const fresh = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  try {
    localStorage.setItem(CLIENT_ID_KEY, fresh);
  } catch {
    // Ignore — ID will still work for this session
  }

  clientId = fresh;
  return fresh;
}

/** Generate a unique write ID for deduplication. */
function generateWriteId(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Compare two ISO 8601 timestamps. Returns negative if a < b, positive if a > b, 0 if equal. */
function compareIso(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  const at = Date.parse(a);
  const bt = Date.parse(b);
  if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
  if (Number.isNaN(at)) return -1;
  if (Number.isNaN(bt)) return 1;
  return at - bt;
}

/** Generate a unique name by appending (2), (3), etc. if the name is taken. */
function makeNameUnique(desiredName: string, takenNames: Set<string>): string {
  const base = (desiredName || '').trim() || 'Profile';
  if (!takenNames.has(base)) return base;

  let counter = 2;
  let next = `${base} (${counter})`;
  while (takenNames.has(next)) {
    counter++;
    next = `${base} (${counter})`;
  }
  return next;
}

/**
 * A profile is "empty" if it has no data or no semesters.
 * Empty profiles are skipped during merge to avoid cluttering accounts.
 */
function isEmptyProfile(entry: CloudProfileEntry): boolean {
  if (!entry.data) return true;
  return (
    !Array.isArray(entry.data.semesters) || entry.data.semesters.length === 0
  );
}

/**
 * Runtime shape check for a CloudPayload received from Firebase.
 * Verifies expected top-level keys and types to reject corrupted or
 * malicious payloads before they are used.
 */
function isValidCloudPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj['version'] !== 'number') return false;
  if (typeof obj['updatedAt'] !== 'string') return false;
  if (typeof obj['activeProfileId'] !== 'string') return false;
  if (!Array.isArray(obj['profiles'])) return false;
  return true;
}

/** Get a DatabaseReference for a user path, or null if database is unavailable. */
function getUserRef(uid: string): DatabaseReference | null {
  if (!database) return null;
  return ref(database, dbPathForUser(uid));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a cloud-ready payload from local application data.
 *
 * Maps each profile to a `CloudProfileEntry` with full typed data
 * (no compact format).
 */
export function buildLocalPayload(data: AppData): CloudPayload {
  const profiles: CloudProfileEntry[] = data.profiles.map((p) => {
    const profileData = data.profilesData[p.id] ?? null;
    return {
      id: p.id,
      name: p.name,
      lastModified: profileData?.lastModified ?? null,
      data: profileData,
    };
  });

  return {
    version: CLOUD_PAYLOAD_VERSION,
    updatedAt: new Date().toISOString(),
    activeProfileId: data.activeProfileId,
    profiles,
  };
}

/**
 * Merge local and cloud payloads into a single payload.
 *
 * Strategy:
 * - Match profiles by ID
 * - When both have the same profile, the newer one (by lastModified) wins
 * - New cloud profiles are added locally (with name deduplication)
 * - Empty profiles (no semesters) are skipped
 * - Name collisions resolved by appending (2), (3), etc.
 */
export function mergeLocalAndCloud(
  localPayload: CloudPayload,
  cloudPayload: CloudPayload,
): CloudPayload {
  const takenNames = new Set<string>();
  const byId = new Map<string, CloudProfileEntry>();

  // Process local profiles first
  for (const lp of localPayload.profiles) {
    if (!lp.id) continue;
    if (isEmptyProfile(lp)) continue;
    const name = (lp.name || 'Profile').trim();
    takenNames.add(name);
    byId.set(lp.id, { ...lp, name });
  }

  // Merge cloud profiles
  for (const cpRaw of cloudPayload.profiles) {
    if (!cpRaw.id) continue;
    if (isEmptyProfile(cpRaw)) continue;

    const cp: CloudProfileEntry = {
      ...cpRaw,
      name: (cpRaw.name || 'Profile').trim(),
    };
    const existing = byId.get(cp.id);

    if (existing) {
      // Same profile ID in both — newer wins
      const localNewer = compareIso(existing.lastModified, cp.lastModified) >= 0;
      const chosen = localNewer ? existing : cp;
      const desired = (chosen.name || 'Profile').trim();
      let finalName = desired;

      if (finalName !== existing.name && takenNames.has(finalName)) {
        finalName = makeNameUnique(finalName, takenNames);
        console.debug(
          LOG,
          'Name collision on merge. Renaming:',
          desired,
          '=>',
          finalName,
        );
      }

      byId.set(cp.id, {
        ...chosen,
        name: finalName,
        data: chosen.data ?? existing.data ?? cp.data,
      });
      takenNames.add(finalName);
      continue;
    }

    // New profile from cloud
    const uniqueName = makeNameUnique(cp.name, takenNames);
    if (uniqueName !== cp.name) {
      console.debug(
        LOG,
        'Name collision on merge. Renaming cloud profile:',
        cp.name,
        '=>',
        uniqueName,
      );
    }
    takenNames.add(uniqueName);
    byId.set(cp.id, { ...cp, name: uniqueName });
  }

  const mergedProfiles = Array.from(byId.values());

  // Determine active profile
  let mergedActive = localPayload.activeProfileId;
  if (!mergedActive || !byId.has(mergedActive)) {
    mergedActive = cloudPayload.activeProfileId;
  }
  if (!mergedActive || !byId.has(mergedActive)) {
    mergedActive = mergedProfiles[0]?.id ?? 'default';
  }

  return {
    version: CLOUD_PAYLOAD_VERSION,
    updatedAt: new Date().toISOString(),
    activeProfileId: mergedActive,
    profiles: mergedProfiles,
  };
}

/**
 * Push a payload to Firebase Realtime Database.
 *
 * Includes client ID and write ID for echo prevention on other tabs/devices.
 */
export async function pushToFirebase(
  userId: string,
  payload: CloudPayload,
): Promise<void> {
  const dbRef = getUserRef(userId);
  if (!dbRef) {
    console.warn(LOG, 'Firebase Database not configured');
    return;
  }

  const cid = ensureClientId();
  lastLocalWriteId = generateWriteId();

  const record: FirebaseRecord = {
    version: CLOUD_PAYLOAD_VERSION,
    updatedAt: new Date().toISOString(),
    writeId: lastLocalWriteId,
    clientId: cid,
    payload,
  };

  console.debug(LOG, 'Pushing to Firebase, writeId=', lastLocalWriteId);
  await set(dbRef, record);
}

/**
 * Pull the current payload from Firebase Realtime Database.
 *
 * Returns `null` if no data exists or Firebase is not configured.
 */
export async function pullFromFirebase(
  userId: string,
): Promise<CloudPayload | null> {
  const dbRef = getUserRef(userId);
  if (!dbRef) {
    console.warn(LOG, 'Firebase Database not configured');
    return null;
  }

  console.debug(LOG, 'Pulling from Firebase for', userId);
  const snapshot = await get(dbRef);

  if (!snapshot.exists()) {
    console.debug(LOG, 'No cloud payload exists');
    return null;
  }

  const val = snapshot.val() as Record<string, unknown> | null;
  if (!val) return null;

  const raw = (val['payload'] ?? val) as Record<string, unknown>;
  if (!isValidCloudPayload(raw)) {
    console.warn(LOG, 'Invalid cloud payload shape — ignoring');
    return null;
  }
  return raw as unknown as CloudPayload;
}

/**
 * Subscribe to realtime updates from Firebase.
 *
 * The callback is invoked with the cloud payload whenever the data changes,
 * except for writes originating from this client (echo prevention).
 *
 * Returns an unsubscribe function, or null if Firebase is not configured.
 */
export function subscribeToFirebase(
  userId: string,
  callback: (payload: CloudPayload) => void,
): (() => void) | null {
  const dbRef = getUserRef(userId);
  if (!dbRef) {
    console.warn(LOG, 'Firebase Database not configured');
    return null;
  }

  const cid = ensureClientId();

  console.debug(LOG, 'Starting realtime listener for', userId);

  const unsubscribe = onValue(dbRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const val = snapshot.val() as Record<string, unknown>;
    const writeId = val['writeId'] as string | undefined;
    const origin = val['clientId'] as string | undefined;
    const rawPayload = (val['payload'] ?? val) as Record<string, unknown>;
    if (!isValidCloudPayload(rawPayload)) {
      console.warn(LOG, 'Invalid realtime payload shape — ignoring');
      return;
    }
    const payload = rawPayload as unknown as CloudPayload;

    // Echo prevention: ignore our own writes
    if (origin && origin === cid) {
      console.debug(LOG, 'Ignoring echo from same clientId');
      return;
    }
    if (writeId && lastLocalWriteId && writeId === lastLocalWriteId) {
      console.debug(LOG, 'Ignoring echo writeId', writeId);
      return;
    }

    console.debug(LOG, 'Remote update received');
    isApplyingRemote = true;
    try {
      callback(payload);
    } catch (err) {
      console.error(LOG, 'Error applying remote update:', err);
    } finally {
      isApplyingRemote = false;
    }
  });

  return unsubscribe;
}

/**
 * Debounced auto-sync: builds a payload from local data and pushes to Firebase
 * after a short delay. Subsequent calls within the debounce window reset the
 * timer, preventing excessive writes during rapid edits.
 *
 * Skipped when currently applying a remote update (prevents feedback loops).
 */
export function debouncedSync(userId: string, data: AppData): void {
  if (isApplyingRemote) {
    console.debug(LOG, 'Skip autosync: currently applying remote payload');
    return;
  }

  if (pendingSyncTimer) {
    clearTimeout(pendingSyncTimer);
  }

  pendingSyncTimer = setTimeout(() => {
    pendingSyncTimer = null;
    const payload = buildLocalPayload(data);
    pushToFirebase(userId, payload).catch((err: unknown) => {
      console.error(LOG, 'Debounced sync failed:', err);
    });
  }, SYNC_DEBOUNCE_MS);
}

/** Cancel any pending debounced sync. */
export function cancelPendingSync(): void {
  if (pendingSyncTimer) {
    clearTimeout(pendingSyncTimer);
    pendingSyncTimer = null;
  }
}

/** Whether the sync service is currently applying a remote update. */
export function getIsApplyingRemote(): boolean {
  return isApplyingRemote;
}
