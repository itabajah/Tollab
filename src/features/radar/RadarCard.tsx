import { useEffect, useMemo, useRef, useState, type FocusEvent } from 'react'
import {
  RADAR_CHIP_LIMIT,
  RADAR_ROTATE_MS,
  buildRadar,
  quipStart,
  radarBucket,
  type MetaPart,
  type RadarSignal,
  type RadarTone,
} from '@/domain/radar'
import { useAppActions, useAppState } from '@/hooks/session'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useNow } from '@/hooks/useNow'
import { IconButton } from '@/components/ui/IconButton'
import { BellOffIcon, CheckIcon } from '@/components/ui/icons'
import { useToast } from '@/components/ui/Toast'
import { useCourseDialog } from '@/features/courses/CourseDialogProvider'
import { isolate } from '@/lib/bidi'
import { cn } from '@/lib/cn'
import { formatYmd } from '@/lib/dates'
import { radarTargetToRequest } from './target'
import { useRadarSnooze } from './useRadarSnooze'

const badgeTone: Record<RadarTone, string> = {
  live: 'bg-accent text-on-accent',
  critical: 'bg-error-bg text-error-text',
  warn: 'bg-warning-bg text-warning-text',
  info: 'bg-inset text-ink-faint',
  calm: 'bg-success-bg text-success-text',
  setup: 'bg-inset text-ink-faint',
}

const chipBadgeTone: Record<RadarTone, string> = {
  live: 'text-ink',
  critical: 'text-error-text',
  warn: 'text-warning-text',
  info: 'text-ink-faint',
  calm: 'text-success-text',
  setup: 'text-ink-faint',
}

const metaTone: Record<NonNullable<MetaPart['tone']>, string> = {
  critical: 'font-medium text-error-text',
  warn: 'font-medium text-warning-text',
}

const enter = 'animate-[radar-in_var(--duration-base)_var(--ease-standard)]'

/** Plain-text rendering of a signal (tooltips), with user text bidi-isolated. */
function describe(signal: RadarSignal): string {
  const parts = [
    signal.titleIsUser ? isolate(signal.title) : signal.title,
    ...signal.meta.map((part) => (part.user ? isolate(part.text) : part.text)),
  ]
  return parts.join(' · ')
}

function Badge({ signal }: { signal: RadarSignal }) {
  return (
    <span
      data-testid="radar-badge"
      className={cn(
        'inline-flex h-[18px] shrink-0 items-center gap-1 rounded-full px-1.5 text-[10px] font-semibold tracking-wide',
        badgeTone[signal.tone],
      )}
    >
      {signal.kind === 'class_now' ? (
        // A live dot in the calendar's "now" colour: the class is happening.
        <span aria-hidden="true" className="size-1.5 rounded-full bg-now-line animate-pulse" />
      ) : null}
      {signal.badge}
    </span>
  )
}

function Meta({ parts }: { parts: MetaPart[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={index} className={part.tone ? metaTone[part.tone] : undefined}>
          <span aria-hidden="true"> · </span>
          {/* Course names / titles / locations are Technion data and usually Hebrew;
              <bdi> keeps them from reordering the app's own text. See lib/bidi. */}
          {part.user ? <bdi>{part.text}</bdi> : part.text}
        </span>
      ))}
    </>
  )
}

function Chip({ signal, onClick }: { signal: RadarSignal; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show ${signal.title}`}
      title={describe(signal)}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-inset px-2 py-0.5 text-[11px] text-ink-muted',
        'transition-colors hover:border-line-strong hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none',
      )}
    >
      <span className={cn('text-[9px] font-semibold tracking-wide', chipBadgeTone[signal.tone])}>
        {signal.badge}
      </span>
      <span className="max-w-[11rem] truncate">
        <bdi>{signal.title}</bdi>
      </span>
      {signal.brief ? <span className="text-ink-faint">· {signal.brief}</span> : null}
    </button>
  )
}

/**
 * The radar: the "what matters right now" card at the top of the app.
 *
 * All content comes from the deterministic `@/domain/radar` build. In live
 * mode the top-ranked signal is pinned as the headline (a user can promote
 * another one from the "up next" chips), only the flavor line rotates, and the
 * signal can be acted on in place — marked done, snoozed until tomorrow, or
 * opened in the course dialog. In calm mode (nothing live) the headline itself
 * rotates through the time-of-day / all-clear / tip signals. Rotation pauses
 * while the tab is hidden, the card is hovered or focused, or the user prefers
 * reduced motion; the clock still ticks so countdowns stay live.
 */
export function RadarCard({ now }: { now?: Date }) {
  const semester = useAppState(
    (s) => s.data.semesters.find((sem) => sem.id === s.currentSemesterId) ?? null,
  )
  const { toggleHomework } = useAppActions()
  const { openCourse } = useCourseDialog()
  const toast = useToast()

  // The shared ticking clock (or the explicit `now` override in tests).
  const resolvedNow = useNow(now)
  const today = formatYmd(resolvedNow)
  const { snoozedIds, snooze, unsnooze } = useRadarSnooze(today)
  const radar = useMemo(
    () => buildRadar({ semester, now: resolvedNow, snoozedIds }),
    [semester, resolvedNow, snoozedIds],
  )
  const bucket = radarBucket(resolvedNow)

  // Pause conditions: hidden tab, reduced-motion preference, or the user
  // hovering/focusing the card (so nothing rotates out from under the pointer).
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [hidden, setHidden] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    const sync = () => setHidden(document.hidden)
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  const paused = hidden || reducedMotion || hovered || focused

  const [tick, setTick] = useState(0)
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  const liveMode = radar.live.length > 0
  // A pinned signal that disappeared (done / snoozed / no longer applies)
  // silently yields to the top of the queue — no stale state to clean up.
  const pinned = pinnedId === null ? undefined : radar.live.find((s) => s.id === pinnedId)
  const calmIndex = tick % radar.calm.length
  // Safe: live is non-empty in live mode and calm is never empty.
  const current = (liveMode ? (pinned ?? radar.live[0]) : radar.calm[calmIndex]) as RadarSignal

  // Live mode rotates the quip; calm mode rotates the headline (and, once it
  // has cycled through every calm signal, their quips too).
  const quipCount = current.quips.length
  const quipOffset = liveMode ? tick : Math.floor(tick / radar.calm.length)
  const quip =
    quipCount > 0
      ? current.quips[(quipStart(current.id, bucket, quipCount) + quipOffset) % quipCount]
      : ''
  const rotates = liveMode ? quipCount > 1 : radar.calm.length > 1 || quipCount > 1

  useEffect(() => {
    if (paused || !rotates) return
    const id = setInterval(() => setTick((t) => t + 1), RADAR_ROTATE_MS)
    return () => clearInterval(id)
  }, [paused, rotates])

  // Focus restoration. An action can unmount the very control that had focus:
  // a chip promotes its signal and leaves the rail, "Done" on the last homework
  // or "Snooze" on the last snoozable signal takes its button away. A removed
  // node fires no blur, so focus would silently fall to <body> and the card
  // would stay paused. Whenever the headline changes while focus was inside
  // the card but no longer is, bring it back to the headline.
  const sectionRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const setMain = (el: HTMLElement | null) => {
    mainRef.current = el
  }
  useEffect(() => {
    if (!focused) return
    const section = sectionRef.current
    if (!section || section.contains(document.activeElement)) return
    mainRef.current?.focus()
  }, [focused, current.id, current.kind])

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
  }

  const open = (signal: RadarSignal) => {
    const request = radarTargetToRequest(signal.target)
    if (request) openCourse(request)
  }

  const markDone = (signal: RadarSignal) => {
    const hw = signal.homework
    if (!hw) return
    toggleHomework(hw.courseId, hw.homeworkId)
    toast.success(`Done: ${isolate(signal.title)}`, {
      action: { label: 'Undo', onClick: () => toggleHomework(hw.courseId, hw.homeworkId) },
    })
  }

  const snoozeCurrent = (signal: RadarSignal) => {
    snooze(signal.id)
    toast.info('Snoozed until tomorrow', {
      description: describe(signal),
      action: { label: 'Undo', onClick: () => unsnooze(signal.id) },
    })
  }

  const actionable = current.target.type !== 'none'
  const chips = liveMode ? radar.live.filter((s) => s.id !== current.id) : []
  const shownChips = chips.slice(0, RADAR_CHIP_LIMIT)
  const hiddenChips = chips.length - shownChips.length
  const animate = !reducedMotion
  // Keyed on id + kind so a signal that changes phase (next -> soon -> live)
  // re-enters like a new headline even though its id — and its snooze — hold.
  const headlineKey = `${current.id}:${current.kind}`

  const headline = (
    <span className="flex min-w-0 items-center gap-2">
      <Badge signal={current} />
      {current.courseColor ? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: current.courseColor }}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">
        <span data-testid="radar-title" className="font-medium text-ink">
          <bdi>{current.title}</bdi>
        </span>
        <Meta parts={current.meta} />
      </span>
    </span>
  )

  const quipLine = (
    <span
      key={`${current.id}:${quip}`}
      data-testid="radar-quip"
      className={cn('mt-1 block truncate text-xs text-ink-faint', animate && enter)}
    >
      {/* A few quips are Hebrew-only; isolating keeps their final punctuation on
          the correct side inside this LTR block. */}
      <bdi>{quip}</bdi>
    </span>
  )

  const mainClasses = cn(
    'min-w-0 flex-1 rounded-card px-3 py-2.5 text-left',
    'focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none focus-visible:ring-inset',
    animate && enter,
    actionable && 'cursor-pointer transition-colors hover:bg-inset/60',
  )

  return (
    // No aria-live: the quip rotates on a timer and a live region would keep
    // interrupting screen-reader users; the headline is the button's accessible
    // name (read on focus) and rotation pauses while the card has focus.
    <section
      ref={sectionRef}
      aria-label="Radar"
      data-testid="radar"
      data-mode={liveMode ? 'live' : 'calm'}
      data-kind={current.kind}
      data-signal-id={current.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      className="overflow-hidden rounded-card border border-line bg-panel shadow-sm"
    >
      <div className="flex items-start">
        {actionable ? (
          <button
            key={headlineKey}
            ref={setMain}
            type="button"
            data-testid="radar-main"
            title={describe(current)}
            onClick={() => open(current)}
            className={mainClasses}
          >
            {headline}
            {quipLine}
          </button>
        ) : (
          // Nothing to open: not a button, but still focusable programmatically
          // so restored focus has somewhere inside the card to land.
          <div
            key={headlineKey}
            ref={setMain}
            tabIndex={-1}
            data-testid="radar-main"
            className={mainClasses}
          >
            {headline}
            {quipLine}
          </div>
        )}
        {current.homework || current.snoozable ? (
          <div className="flex shrink-0 items-center gap-0.5 pt-2 pr-2">
            {current.homework ? (
              <IconButton
                aria-label={`Mark ${current.title} done`}
                title="Mark done"
                variant="ghost"
                size="sm"
                onClick={() => markDone(current)}
              >
                <CheckIcon width={15} height={15} strokeWidth={2.5} />
              </IconButton>
            ) : null}
            {current.snoozable ? (
              <IconButton
                aria-label="Snooze until tomorrow"
                title="Snooze until tomorrow"
                variant="ghost"
                size="sm"
                onClick={() => snoozeCurrent(current)}
              >
                <BellOffIcon width={15} height={15} />
              </IconButton>
            ) : null}
          </div>
        ) : null}
      </div>

      {current.progress !== undefined ? (
        // How far into the running class we are; the width steps once a minute.
        <div className="h-0.5 w-full bg-progress-bg" aria-hidden="true">
          <div
            data-testid="radar-progress"
            className="h-full bg-progress-fill transition-[width] duration-500 ease-out"
            style={{ width: `${Math.round(current.progress * 100)}%` }}
          />
        </div>
      ) : null}

      {shownChips.length > 0 ? (
        <div
          data-testid="radar-chips"
          className="flex items-center gap-1.5 overflow-x-auto border-t border-line px-3 py-1.5 scrollbar-hidden"
        >
          <span className="shrink-0 text-[10px] font-semibold tracking-wide text-ink-faint uppercase">
            Up next
          </span>
          {shownChips.map((signal) => (
            <Chip key={signal.id} signal={signal} onClick={() => setPinnedId(signal.id)} />
          ))}
          {hiddenChips > 0 ? (
            <span className="shrink-0 text-[10px] text-ink-faint">+{hiddenChips} more</span>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
