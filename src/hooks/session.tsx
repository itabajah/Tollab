import { createContext, useContext, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { Session } from '@/store/session'
import type { AppStoreState } from '@/store/appStore'
import type { ProfilesState } from '@/store/profilesStore'

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (session === null) {
    throw new Error('useSession must be used inside a SessionProvider')
  }
  return session
}

/** Reactive selector over the active profile's app store. */
export function useAppState<T>(selector: (state: AppStoreState) => T): T {
  return useStore(useSession().appStore, selector)
}

/** Stable action bundle (zustand actions never change identity). */
export function useAppActions() {
  const store = useSession().appStore
  return store.getState()
}

export function useProfilesState<T>(selector: (state: ProfilesState) => T): T {
  return useStore(useSession().profilesStore, selector)
}
