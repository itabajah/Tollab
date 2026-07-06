import type { CloudPayload } from '@/domain/merge'
import type { CloudRecordV3 } from './protocol'

/** The storage transport the sync engine drives (RTDB in prod, a fake in tests). */
export interface CloudBackend {
  load(): Promise<unknown | null>
  save(record: CloudRecordV3): Promise<void>
  /**
   * Subscribes to remote changes; returns an unsubscribe function. `onError` is
   * invoked if the backend cancels the subscription (e.g. permission revoked or
   * connection lost) so the engine can reflect that sync is no longer live
   * instead of silently reporting 'synced' forever.
   */
  subscribe(onValue: (raw: unknown) => void, onError?: (error: unknown) => void): () => void
}

export type SyncStatus = 'idle' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error'

/** The bridge between the sync engine and the app's local state. */
export interface SyncHost {
  getLocalPayload(): CloudPayload
  applyRemotePayload(payload: CloudPayload): void
}
