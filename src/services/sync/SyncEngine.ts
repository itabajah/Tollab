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
 * A stable fingerprint of a payload's profile data — id + lastModified + whether
 * it carries data — independent of ordering and of the (device-local) active
 * profile. Used to decide whether a merge recovered something the remote lacked
 * and must be pushed back, without ping-ponging on ordering or active-profile.
 */
function profilesFingerprint(payload: CloudPayload): string {
  return [...payload.profiles]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => `${p.id}:${p.lastModified ?? ''}:${p.data ? '1' : '0'}`)
    .join(',')
}

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
  let stopped = false
  let lastAppliedPayload: string | null = null

  const rememberWriteId = (writeId: string) => {
    recentWriteIds.push(writeId)
    if (recentWriteIds.length > WRITE_RING_SIZE) recentWriteIds.shift()
  }

  const pushPayload = async (payload: CloudPayload): Promise<boolean> => {
    const writeId = newId()
    rememberWriteId(writeId)
    const record = buildCloudRecord(payload, clientId, writeId, now())
    setStatus('syncing')
    try {
      await backend.save(record)
      setStatus('synced')
      return true
    } catch {
      setStatus('error')
      return false
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

    // Merge with current local state (last-write-wins) instead of blindly
    // overwriting — otherwise an unpushed local edit or a local-only profile is
    // lost. Mirrors the reconciliation start() performs at login.
    const merged = mergePayloads(host.getLocalPayload(), normalized.payload, now())
    const serialized = JSON.stringify(merged)
    if (serialized === lastAppliedPayload) return
    applyRemote(merged)

    // If the merge kept profile data the remote lacked (newer or local-only),
    // push the union so it reaches the cloud. Own-write suppression prevents a
    // loop; the fingerprint ignores ordering + active profile so it can't ping-pong.
    if (profilesFingerprint(merged) !== profilesFingerprint(normalized.payload)) {
      void pushPayload(merged)
    }
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
      try {
        const raw = await backend.load()
        if (stopped) return // torn down during the load round-trip
        const normalized = raw !== null ? normalizeCloudRecord(raw) : null
        const cloudPayload: CloudPayload = normalized?.payload ?? {
          activeProfileId: null,
          profiles: [],
        }
        const merged = mergePayloads(host.getLocalPayload(), cloudPayload, now())
        if (stopped) return // don't apply/push/subscribe after teardown (e.g. sign-out)
        applyRemote(merged)
        const ok = await pushPayload(merged)
        if (stopped) return
        unsubscribe = backend.subscribe(handleRemote)
        if (ok) setStatus('synced')
      } catch {
        // load() rejected (network/permission) — surface it instead of hanging
        // on 'connecting', and never let the rejection escape unhandled.
        if (!stopped) setStatus('error')
      }
    },

    stop() {
      stopped = true
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
