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
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'

export interface HeaderTickerProps {
  /** Current time; the sole source of the ticker's time/randomness. */
  now?: Date
  /** Deep-link callback for the active item; App wires this to the course dialog. */
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

  // The shared ticking clock (or the explicit `now` override in tests).
  const resolvedNow = useNow(now)
  const seedBase = tickerSeed(resolvedNow)

  // Recompute the item set only when a content-defining input changes — including
  // the coarse `seedBase` bucket, NOT the raw per-minute `now`. Depending on
  // `resolvedNow` directly gave `items` a fresh identity every minute, which reset
  // the rotation and anti-repeat window (defeating both). Within a bucket `items`
  // stays stable; at a bucket boundary it recomputes and re-seeds intentionally.
  const items = useMemo(
    () => buildTickerItems({ semester, now: resolvedNow, hasAnySemester }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on seedBase, not raw now
    [semester, hasAnySemester, seedBase],
  )

  const [current, setCurrent] = useState<TickerItem | null>(null)
  const recentRef = useRef<string[]>([])
  const rotationRef = useRef(0)

  // Pause conditions: hidden tab, reduced-motion preference, or the user
  // actively hovering/focusing the strip (so an item can't rotate out from under
  // the pointer mid-click).
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [hidden, setHidden] = useState(false)
  const [interacting, setInteracting] = useState(false)
  useEffect(() => {
    const sync = () => setHidden(document.hidden)
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  const paused = hidden || reducedMotion || interacting

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

  // Motivational / streak / setup items have no course to open (target 'none').
  // Keep the element a <button> but make it read as non-interactive so it doesn't
  // invite a click that goes nowhere.
  const actionable = current.target.type !== 'none'

  return (
    // No aria-live: the strip auto-rotates every ~9s, and a live region would
    // re-announce each rotation and continually interrupt screen-reader users.
    // The current text is still the button's accessible name (read on focus), and
    // rotation pauses while the strip is focused, so it stays explorable.
    <button
      type="button"
      data-testid="header-ticker"
      onClick={() => {
        if (actionable) onSelect(current.target)
      }}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={() => setInteracting(false)}
      aria-disabled={!actionable || undefined}
      title={current.text}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-control border border-line bg-inset px-3 py-2.5',
        'text-left text-[13px] text-ink-muted transition-colors',
        'focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none',
        actionable ? 'cursor-pointer hover:bg-panel hover:text-ink' : 'cursor-default',
      )}
    >
      <span
        data-testid="header-ticker-badge"
        className={cn(
          'inline-flex h-[18px] min-w-[2.75rem] shrink-0 items-center justify-center rounded-full bg-panel px-1.5',
          'text-[10px] font-semibold tracking-wide text-ink-faint',
        )}
      >
        {current.badge}
      </span>
      {/* Keyed on the item id so each rotation cross-fades (disabled under
          reduced motion, where the global block also zeroes the duration). */}
      <span
        key={current.id}
        data-testid="header-ticker-text"
        className={cn(
          'min-w-0 flex-1 truncate',
          !reducedMotion && 'animate-[fade-in_var(--duration-base)_var(--ease-standard)]',
        )}
      >
        {current.text}
      </span>
    </button>
  )
}
