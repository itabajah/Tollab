import { createContext, useContext, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { SyncController } from '@/store/syncController'
import { createSyncStore, type SyncState } from '@/store/syncStore'

const SyncContext = createContext<SyncController | null>(null)

// A stable store used when there is no controller (offline build): always
// reports 'unavailable', so useStore has a real store to subscribe to and hook
// order stays constant.
const unavailableStore = createSyncStore('unavailable')

export function SyncProvider({
  controller,
  children,
}: {
  controller: SyncController | null
  children: ReactNode
}) {
  return <SyncContext.Provider value={controller}>{children}</SyncContext.Provider>
}

/** The sync controller, or null when Firebase config is absent (offline build). */
export function useSyncController(): SyncController | null {
  return useContext(SyncContext)
}

/** Reactive sync UI state; reports 'unavailable' when there is no controller. */
export function useSyncState<T>(selector: (state: SyncState) => T): T {
  const controller = useContext(SyncContext)
  return useStore(controller?.store ?? unavailableStore, selector)
}
