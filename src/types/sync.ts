/**
 * Firebase sync and cloud payload types for the Tollab academic management app.
 *
 * The cloud model stores ALL profiles for a user in a single Firebase node.
 * These types use full readable property names (no compact/abbreviated format).
 */

import type { ProfileData } from './profile';

/** Sync connection state for the Firebase cloud sync UI. */
export enum FirebaseSyncState {
  /** Not signed in. */
  Disconnected = 'disconnected',
  /** Sign-in or sync in progress. */
  Syncing = 'syncing',
  /** Successfully synced. */
  Synced = 'synced',
  /** Sync failed with an error. */
  Error = 'error',
}

/** Information about a sync conflict (local vs cloud data divergence). */
export interface SyncConflictInfo {
  /** Number of profiles in local storage. */
  localProfileCount: number;
  /** Number of profiles in cloud storage. */
  cloudProfileCount: number;
  /** ISO 8601 timestamp of last local modification. */
  localLastModified: string | null;
  /** ISO 8601 timestamp of last cloud modification. */
  cloudLastModified: string | null;
}

/** Conflict resolution choice presented to the user. */
export type SyncConflictResolution = 'use_cloud' | 'use_local' | 'merge';

/**
 * A single profile entry within a cloud payload.
 * Uses clean, full property names (not compact format).
 */
export interface CloudProfileEntry {
  /** Profile ID. */
  id: string;
  /** Profile display name. */
  name: string;
  /** ISO 8601 timestamp of last modification, or null. */
  lastModified: string | null;
  /** Full profile data. */
  data: ProfileData | null;
}

/**
 * Cloud payload containing all profiles for a single user.
 * Stored at `tollab/users/{uid}/data` in Firebase Realtime Database.
 */
export interface CloudPayload {
  /** Payload format version. */
  version: number;
  /** ISO 8601 timestamp of last cloud update. */
  updatedAt: string;
  /** Active profile ID, or null. */
  activeProfileId: string | null;
  /** All profiles for this user. */
  profiles: CloudProfileEntry[];
}
