import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * A single ticking clock shared through context. Mounting one `NowProvider`
 * near the app root means only the components that actually read the time
 * (`useNow()` consumers: the calendar now-line, exam urgency, homework due
 * labels, the ticker) re-render on each tick — the rest of the tree (e.g. the
 * course list) is untouched. Previously a `useNow()` at the app root re-rendered
 * everything every minute.
 */
const NowContext = createContext<Date | null>(null)

export function NowProvider({
  children,
  intervalMs = 60_000,
}: {
  children: ReactNode
  intervalMs?: number
}) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return <NowContext.Provider value={now}>{children}</NowContext.Provider>
}

/**
 * Current time. Pass `override` (tests, or a deliberately fixed clock) to bypass
 * the ticking context; otherwise reads the nearest `NowProvider`. Falls back to
 * a stable snapshot when rendered without a provider so components stay usable
 * in isolation.
 */
export function useNow(override?: Date): Date {
  const ctx = useContext(NowContext)
  const [fallback] = useState(() => new Date())
  return override ?? ctx ?? fallback
}
