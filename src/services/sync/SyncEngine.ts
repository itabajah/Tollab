import { mergePayloads, type CloudPayload } from '@/domain/merge'
import { newId } from '@/domain/ids'
import type { CloudBackend, SyncHost, SyncStatus } from './backend'
import { buildCloudRecord, normalizeCloudRecord } from './protocol'

export interface SyncEngineOptions {
  backend: CloudBackend
  host: SyncHost
  clientId: string
  debounceMs?: number
  onStatus?: (status: SyncStatus) => void
  now?: () => Date
}

export interface SyncEngine {
  start(): Promise<void>
  stop(): void
  notifyLocalChange(): void
  flush(): Promise<void>
}

const WRITE_RING_SIZE = 20

/**
 * Drives cloud sync over a {@link CloudBackend}. On start it merges local and
 * cloud state (last-write-wins), applies + pushes the result, then subscribes.
 * Local changes push on a trailing debounce. Own writes are ignored on the way
 * back (by clientId or a recent-writeId ring), and remote applies never trigger
 * a push, so there is no echo loop.
 */
export function createSyncEngine(options: SyncEngineOptions): SyncEngine {
  const { backend, host, clientId } = options
  const debounceMs = options.debounceMs ?? 750
  const now = options.now ?? (() => new Date())
  const setStatus = (status: SyncStatus) => options.onStatus?.(status)

  const recentWriteIds: string[] = []
  let unsubscribe: (() => void) | null = null
  let pendingTimer: ReturnType<typeof setTimeout> | null = null
  let applyingRemote = false
  let lastAppliedPayload: string | null = null

  const rememberWriteId = (writeId: string) => {
    recentWriteIds.push(writeId)
    if (recentWriteIds.length > WRITE_RING_SIZE) recentWriteIds.shift()
  }

  const pushPayload = async (payload: CloudPayload) => {
    const writeId = newId()
    rememberWriteId(writeId)
    const record = buildCloudRecord(payload, clientId, writeId, now())
    setStatus('syncing')
    try {
      await backend.save(record)
      setStatus('synced')
    } catch {
      setStatus('error')
    }
  }

  const applyRemote = (payload: CloudPayload) => {
    applyingRemote = true
    try {
      host.applyRemotePayload(payload)
      lastAppliedPayload = JSON.stringify(payload)
    } finally {
      applyingRemote = false
    }
  }

  const handleRemote = (raw: unknown) => {
    const normalized = normalizeCloudRecord(raw)
    if (!normalized) return
    // Echo suppression: ignore our own writes.
    if (normalized.clientId === clientId) return
    if (normalized.writeId && recentWriteIds.includes(normalized.writeId)) return

    const serialized = JSON.stringify(normalized.payload)
    if (serialized === lastAppliedPayload) return
    applyRemote(normalized.payload)
  }

  const flush = async () => {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer)
      pendingTimer = null
    }
    await pushPayload(host.getLocalPayload())
  }

  return {
    async start() {
      setStatus('connecting')
      const raw = await backend.load()
      const normalized = raw !== null ? normalizeCloudRecord(raw) : null
      const cloudPayload: CloudPayload = normalized?.payload ?? {
        activeProfileId: null,
        profiles: [],
      }
      const merged = mergePayloads(host.getLocalPayload(), cloudPayload, now())
      applyRemote(merged)
      await pushPayload(merged)
      unsubscribe = backend.subscribe(handleRemote)
      setStatus('synced')
    },

    stop() {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
      if (pendingTimer !== null) {
        clearTimeout(pendingTimer)
        pendingTimer = null
      }
      setStatus('idle')
    },

    notifyLocalChange() {
      if (applyingRemote) return
      if (pendingTimer !== null) clearTimeout(pendingTimer)
      pendingTimer = setTimeout(() => {
        pendingTimer = null
        void pushPayload(host.getLocalPayload())
      }, debounceMs)
    },

    flush,
  }
}
