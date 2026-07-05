import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildTickerItems,
  pickTickerItem,
  tickerSeed,
  HEADER_TICKER_ROTATE_MS,
  TICKER_RECENT_WINDOW,
  type TickerItem,
  type TickerTarget,
} from '@/domain/ticker'
import { useAppState } from '@/hooks/session'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'

export interface HeaderTickerProps {
  /** Current time; the sole source of the ticker's time/randomness. */
  now?: Date
  /** Deep-link callback for the active item (wired later); defaults to a no-op. */
  onSelect?: (target: TickerTarget) => void
}

const noop = () => {}

/**
 * The playful reminder strip at the top of the app. All content and rotation
 * are driven by the deterministic `@/domain/ticker` helpers: `buildTickerItems`
 * produces the applicable items and `pickTickerItem` chooses which one is
 * on screen, avoiding recently shown ids. Rotation pauses while the tab is
 * hidden or the user prefers reduced motion (a static item is still shown).
 */
export function HeaderTicker({ now, onSelect = noop }: HeaderTickerProps) {
  const semester = useAppState(
    (s) => s.data.semesters.find((sem) => sem.id === s.currentSemesterId) ?? null,
  )
  const hasAnySemester = useAppState((s) => s.data.semesters.length > 0)

  // Stable fallback so an omitted `now` prop does not churn the memo each render.
  const [fallbackNow] = useState(() => new Date())
  const resolvedNow = now ?? fallbackNow

  // Memoized so a stable context keeps a stable `items` identity — otherwise the
  // effects below would re-seed (and the rotation reset) on every render.
  const items = useMemo(
    () => buildTickerItems({ semester, now: resolvedNow, hasAnySemester }),
    [semester, resolvedNow, hasAnySemester],
  )
  const seedBase = tickerSeed(resolvedNow)

  const [current, setCurrent] = useState<TickerItem | null>(null)
  const recentRef = useRef<string[]>([])
  const rotationRef = useRef(0)

  // Pause conditions: hidden tab or a reduced-motion preference.
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const sync = () => setHidden(document.hidden)
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  const paused = hidden || reducedMotion

  // (Re)seed the displayed item whenever the item set or time bucket changes.
  useEffect(() => {
    rotationRef.current = 0
    const first = pickTickerItem(items, { seed: seedBase, recentIds: [] })
    setCurrent(first)
    recentRef.current = first ? [first.id] : []
  }, [items, seedBase])

  // Advance on an interval, unless paused or there is nothing to rotate between.
  useEffect(() => {
    if (paused || items.length <= 1) return
    const id = setInterval(() => {
      rotationRef.current += 1
      const next = pickTickerItem(items, {
        seed: seedBase + rotationRef.current,
        recentIds: recentRef.current,
      })
      if (!next) return
      setCurrent(next)
      recentRef.current = [next.id, ...recentRef.current].slice(0, TICKER_RECENT_WINDOW)
    }, HEADER_TICKER_ROTATE_MS)
    return () => clearInterval(id)
  }, [paused, items, seedBase])

  if (!current) return null

  return (
    <button
      type="button"
      data-testid="header-ticker"
      onClick={() => onSelect(current.target)}
      aria-live="polite"
      title={current.text}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xs border border-line bg-inset px-3 py-2.5',
        'text-left text-[13px] text-ink-muted transition-colors hover:bg-panel hover:text-ink',
      )}
    >
      <span
        data-testid="header-ticker-badge"
        className={cn(
          'inline-flex h-[18px] shrink-0 items-center justify-center rounded-full bg-panel px-1.5',
          'text-[10px] font-semibold tracking-wide text-ink-faint',
        )}
      >
        {current.badge}
      </span>
      <span data-testid="header-ticker-text" className="min-w-0 flex-1 truncate">
        {current.text}
      </span>
    </button>
  )
}
