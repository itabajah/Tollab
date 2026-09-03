import type { RadarKind } from './types'

// ---------------------------------------------------------------------------
// Quip catalog
// ---------------------------------------------------------------------------
//
// The radar keeps its facts in the title/meta line, so a quip is pure flavor:
// the second line that gives the card its voice. Curated from the legacy ticker
// catalog (Hebrew flourishes included) with the facts stripped out; a few are
// conditional on context (`requires`) — e.g. a free-time or late-night line only
// shows when that variable is actually present.

export interface Quip {
  text: string
  /** Variable names that must be present (non-empty) for this quip to apply. */
  requires?: readonly string[]
}

type Catalog = Record<RadarKind, readonly (string | Quip)[]>

const LATE: Quip[] = [
  { text: "It's {time}. Sleep now, sprint tomorrow.", requires: ['late'] },
  { text: '{time}. Nothing good gets written after midnight. Rest.', requires: ['late'] },
]

export const RADAR_QUIPS: Catalog = {
  // -- Setup ----------------------------------------------------------------
  no_semester: [
    "You're driving without a map. Let's fix that.",
    "Zero semesters selected. That's… bold.",
    'Create one and we can bully you productively.',
  ],
  no_courses: [
    'Add one and let the chaos begin.',
    'Your semester is empty. Feed it a course.',
    'No courses. No problems. No degree.',
    "That's peaceful… and incorrect.",
  ],
  no_schedule: [
    "You're free… but also in danger.",
    'Add class times and stop living on hard mode.',
    'The calendar is offended.',
    "Either you're a genius or the timetable is missing.",
  ],

  // -- Classes --------------------------------------------------------------
  class_now: [
    'Be academically present™.',
    'שיעור עכשיו. פוקוס.',
    'Notes time.',
    'No disappearing.',
    'Breaking news: lecture is live. Your attendance is not.',
    'This is not a drill. This is a lecture. עכשיו.',
    "Pretend you're not multitasking.",
    'Act natural.',
    'Phone down gently.',
    "We're going in.",
    'Minimize chaos. Maximize notes.',
    'Your only job is to exist and absorb.',
  ],
  class_soon: [
    'This is your warning shot.',
    'Shoes. Keys. Brain. Go.',
    'Leave now like you meant it.',
    'Stop side quests. Start main quest.',
  ],
  class_next: [
    'Do not be late.',
    'Shoes on. Brain on.',
    'Speedrun: arrive before {start}.',
    'Time to switch to campus-mode.',
    'Main quest > side quests.',
    'Grab water, keys, dignity.',
    'If you leave on time, you can arrive like you meant to.',
    'The bed is a liar.',
    "Don't let it surprise you.",
    'Your backpack misses you.',
    { text: 'Free for {free} — enough for a homework sprint.', requires: ['free'] },
  ],
  class_tomorrow: [
    'Set the alarm. Respectfully.',
    'Prepare your brain.',
    "Don't let it jump-scare you.",
    'Plan like a legend.',
    "Tomorrow's you called. They'd like you to sleep on time.",
    { text: "It's {time}. Set the alarm, then sleep.", requires: ['late'] },
  ],

  // -- Homework -------------------------------------------------------------
  hw_overdue: [
    'Future you is not impressed.',
    "That's not a flex.",
    'The deadline left without you.',
    'Congratulations, you unlocked: OVERDUE MODE.',
    "We're not saying panic… but.",
    'Friendly reminder with a tiny scream.',
    'Damage control, not self-hate.',
    'Step 1: open it. Step 2: do literally anything.',
    'We can still clutch. Open it and do ONE thing.',
    'Calm. Open it. Tiny progress. Win.',
  ],
  hw_today: [
    'Do it. Now.',
    'Quick win?',
    'Chef, start cooking.',
    'Tomorrow-you will send a thank-you note.',
    'No drama, just results.',
    'We can do hard things.',
    'Do it messy, do it done.',
    'A 60% done is still 100% submitted.',
    'Your keyboard is about to see things.',
    'This is your montage moment.',
    'Enter goblin mode (but submit).',
    { text: "You're free for {free}. That's a submission window.", requires: ['free'] },
  ],
  hw_tomorrow: [
    'Do future-you a favor.',
    'Start now and avoid the 2am arc.',
    'Begin the ritual.',
    'One small chunk today = massive relief.',
    { text: "You're free for {free} — a head start fits.", requires: ['free'] },
    ...LATE,
  ],
  hw_soon: [
    'Tiny steps count.',
    "Start with 10 minutes. That's it.",
    'Procrastination called. I declined.',
    'Your brain will thank you.',
    'Start now or panic later. Your call.',
    'Small progress > big panic.',
    'Open it. Stare at it. That counts as step 1.',
    'Put 10 minutes on the clock and go.',
    'Do a tiny part. Become unstoppable.',
    'You still have time. Use it.',
    { text: "You're free for {free}. A first pass fits.", requires: ['free'] },
    ...LATE,
  ],
  hw_nodate: [
    "That's how assignments sneak-attack you.",
    'Set a date. Your future self will thank you.',
    'Floating in the void. Pin it down.',
    'A task without a date is just anxiety in disguise.',
    "Bold strategy. Let's not test it.",
    'This is how procrastination gets a passport.',
  ],
  hw_many: [
    "That's a whole season of content.",
    'Pick one. Delete it. Repeat.',
    'This is not a collectible set.',
    'Mission: get it down to {countMinusOne}. Start now.',
    'This is not a personality trait.',
    "Let's do some subtraction.",
  ],

  // -- Exams ----------------------------------------------------------------
  exam_today: [
    'Minimal panic. Maximum focus.',
    "Today's boss fight. You've got this.",
    'Eat. Breathe. Destroy the questions politely.',
  ],
  exam_tomorrow: [
    'Tonight is for a calm review.',
    'Sleep is part of the strategy.',
    'One last pass, then rest.',
  ],
  exam_soon: [
    'Boss-fight territory.',
    'Start with the easiest topic.',
    'No panic. Just a plan.',
    'This is where the training arc becomes real.',
    ...LATE,
  ],
  exam: [
    'Good luck.',
    'Time to become unstoppable.',
    'Start with one topic today.',
    'Training arc begins.',
    'You got this.',
    "Today's plan: one PDF, no chaos.",
    'One page at a time.',
    'One tiny topic today. Win tomorrow.',
    "Don't let it spawn-camp you.",
    ...LATE,
  ],

  // -- Recordings -----------------------------------------------------------
  recordings_backlog: [
    "That's not going to watch itself.",
    'Snack + lecture?',
    "Congratulations, you're basically a streaming service.",
    "Start one on 1.25x and pretend it's cardio.",
    "Pick one and press play. That's it.",
    'One today = hero arc.',
  ],
  recordings_big: [
    'Marathon, not meltdown.',
    "That's a whole Netflix season. Start episode 1.",
    'Ok listen. One today = hero arc.',
    'A multi-episode saga. Start chapter 1.',
  ],

  // -- Calm -----------------------------------------------------------------
  late_night: [
    "If you're still studying, respect. If not… sleep.exe?",
    'Hydrate, stretch, and maybe close TikTok.',
    'Your brain deserves a break. Or a tiny homework sprint.',
    'Night owl energy. Keep it clean: 20 min work, then sleep.',
    "If you're here by choice, you're powerful. If not, blink twice.",
    'This is either dedication or a sleep schedule crime scene.',
  ],
  weekend: [
    'Future-you would love 30 minutes of progress.',
    'You can rest *and* do one tiny task. Balance.',
    'Side quests: choose a homework and delete it from existence.',
    "Recharge… then do one thing so Sunday doesn't jump-scare you.",
    'A little progress now = maximum peace later.',
  ],
  morning: [
    'Small win: pick ONE task and finish it.',
    'Morning energy is OP. Use it before it disappears.',
    'Do something your future self will thank you for.',
    'Morning brain is peak performance. Spend it wisely.',
    'One tiny task now = no panic later.',
  ],
  no_classes_today: [
    'Suspiciously peaceful.',
    'Use this power wisely.',
    'Side quest: do homework before it becomes a boss fight.',
    'Your one chance to get ahead before chaos returns.',
    'Please do not spend this blessing on scrolling.',
  ],
  done_today: [
    'Debrief: what did we learn? (Kidding. Rest.)',
    "Homework o'clock or nap o'clock. Choose wisely.",
    'You survived. Reward yourself responsibly.',
    'Campus mode: off. Brain: still allowed.',
  ],
  all_clear: [
    'Enjoy the calm (and maybe study anyway).',
    'Nothing urgent. This is your chance to get ahead.',
    'No immediate fires. Keep it that way.',
    'Who are you and what did you do with you?',
    'This is rare. Cherish it.',
    "Suspicious… but we'll take it.",
    "Don't panic—this feeling is allowed.",
    'Universe is buffering. Enjoy.',
  ],
  roast: [
    'A beautifully engineered obstacle.',
    "Confidently assigns 6 hours of work like you don't have a life.",
    'Really said “time management” and meant “good luck”.',
    "Thinks it's the main character. You're the one doing side quests.",
    'Has the audacity to exist twice a week.',
    'A hobby for people who enjoy suffering (respectfully).',
    'Somehow both important and impossible.',
    'Teaching resilience. Not on purpose. But still.',
  ],
  tip: [
    "You don't need motivation. You need a timer.",
    'If you do 15 minutes now, later-you stops yelling.',
    "Your to-do list isn't scary. It's just loud.",
    'Do the smallest possible version of the task. Still counts.',
    "Open the thing. Name the thing. That's step one.",
    'Tiny progress beats perfect plans.',
    'You can be behind and still make progress today.',
    "Today's strategy: fewer tabs, more output.",
  ],
}

/**
 * Renders every applicable quip for a kind: conditional quips are dropped when
 * a required variable is missing/empty, placeholders are filled (unknown ones
 * become ''), and whitespace is collapsed. Always non-empty: every kind has at
 * least one unconditional quip.
 */
export function renderQuips(kind: RadarKind, vars: Record<string, string>): string[] {
  const out: string[] = []
  for (const entry of RADAR_QUIPS[kind]) {
    const quip: Quip = typeof entry === 'string' ? { text: entry } : entry
    if (quip.requires?.some((name) => !vars[name])) continue
    out.push(
      quip.text
        .replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
  }
  return out
}
