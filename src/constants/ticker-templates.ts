/**
 * Header ticker message templates — all 100+ messages from the legacy
 * header-ticker.js, organized by category.
 *
 * Placeholders use `{name}` syntax and are resolved at render time by
 * the `useTickerMessages` hook.
 */

import type { TickerTemplateMap } from '@/types';

/**
 * Complete template map for every ticker category.
 *
 * Context rules (when each category is shown) are documented in
 * DOCUMENTATION.md § 6.11 and enforced by the `useTickerMessages` hook.
 */
export const HEADER_TICKER_TEMPLATES: TickerTemplateMap = {
  // ── Setup / empty states ────────────────────────────────────────────
  no_semester: [
    "No active semester. You're driving without a map.",
    "You have zero semesters selected. That's… bold.",
    'Start a semester first. Then we can bully you productively.',
  ],
  no_courses: [
    'No courses yet. Add one and let the chaos begin.',
    'Your semester is empty. Feed it a course.',
    'No courses found. Click + and build your timetable empire.',
    "No courses. No problems. No degree. (Let's add a course.)",
    "Your course list is empty. That's peaceful… and incorrect.",
  ],
  no_schedule: [
    "No schedule set. You're free… but also in danger.",
    'Your courses have zero class times. Add schedule slots and stop living on hard mode.',
    "No lectures on the timetable. Either you're a genius or the schedule is missing.",
    'Schedule is empty. The calendar is offended.',
  ],
  no_classes_today: [
    'No classes today. Suspiciously peaceful.',
    'Today: no lectures. Use this power wisely.',
    'No classes today. Side quest: do homework before it becomes a boss fight.',
    'No lectures today. This is your one chance to get ahead before chaos returns.',
    'No classes today. Please do not spend this blessing on scrolling.',
  ],
  all_clear: [
    'All clear. Enjoy the calm (and maybe study anyway).',
    "Nothing urgent. This is your chance to get ahead.",
    'No immediate fires. Keep it that way.',
    "You're surprisingly on top of things. Who are you and what did you do with you?",
    "Nothing urgent right now. This is rare. Cherish it.",
    "The task list is quiet. Suspicious… but we'll take it.",
    "You're caught up. Don't panic—this feeling is allowed.",
    'Nothing urgent. Universe is buffering. Enjoy.',
  ],

  // ── Time-of-day ─────────────────────────────────────────────────────
  late_night: [
    "It's late. If you're still studying, respect. If not… sleep.exe?",
    'Late-night mode detected. Hydrate, stretch, and maybe close TikTok.',
    "It's {time}. Your brain deserves a break. Or a tiny homework sprint.",
    'Night owl energy at {time}. Keep it clean: 20 min work, then sleep.',
    "It's {time}. If you're here by choice, you're powerful. If not, blink twice.",
    '{time}. This is either dedication or a sleep schedule crime scene.',
  ],
  morning: [
    'Good morning. Small win: pick ONE task and finish it.',
    'Morning energy is OP. Use it before it disappears.',
    "You're awake! Time to do something your future self will thank you for.",
    'Morning brain is peak performance. Spend it wisely.',
    'Good morning. One tiny task now = no panic later.',
  ],
  weekend: [
    'Weekend vibes. Also: future-you would love 30 minutes of progress.',
    "It's the weekend. You can rest *and* do one tiny task. Balance.",
    'Weekend = side quests. Choose a homework and delete it from existence.',
    "Weekend. Recharge… then do one thing so Monday doesn't jump-scare you.",
    "It's the weekend. A little progress now = maximum peace later.",
  ],

  // ── Class schedule ──────────────────────────────────────────────────
  class_now: [
    'Lecture is live עכשיו ({start}-{end}). Be academically present™.',
    'שיעור עכשיו{courseMaybe}. פוקוס.',
    'Live right now{courseMaybe}. Notes time.',
    'Class is happening עכשיו ({start}-{end}). No disappearing.',
    'Breaking news: lecture is live. Your attendance is not.',
    'This is not a drill. This is a lecture. עכשיו{courseMaybe}.',
    "LIVE NOW{courseMaybe}. Pretend you're not multitasking.",
    'You are currently in a lecture. Act natural.',
    'Right now ({start}-{end}){courseMaybe}. Phone down gently.',
    "It's class time{courseMaybe}. We're going in.",
    'Lecture now. Minimize chaos. Maximize notes.',
    'Class is live. Your only job is to exist and absorb.',
  ],
  class_soon: [
    'Class in {minutes} minutes{courseMaybe}. This is your warning shot.',
    '{minutes} minutes until lecture{courseMaybe}. Shoes. Keys. Brain. Go.',
    'Incoming in {minutes} min{courseMaybe}. Leave now like you meant it.',
    'Class starts soon{courseMaybe}. Stop side quests. Start main quest.',
  ],
  class_next: [
    'Next lecture at {start}{courseMaybe}. Do not be late.',
    'Lecture starts in {minutes} minutes{courseMaybe}. Move!',
    'Reminder: lecture at {start}{courseMaybe}. You got this.',
    '{minutes} minutes until class{courseMaybe}. Shoes on. Brain on.',
    'Speedrun: arrive before {start}. (You can do it.)',
    'Upcoming at {start}{courseMaybe}. Time to switch to campus-mode.',
    'Next up: {start}{courseMaybe}. Main quest > side quests.',
    'Class at {start}{courseMaybe}. Grab water, keys, dignity.',
    'If you leave now, you can arrive like you meant to. ({start})',
    'Reminder: {start}{courseMaybe}. The bed is a liar.',
    "Next class at {start}{courseMaybe}. Don't let it surprise you.",
    '{start} is coming{courseMaybe}. Your backpack misses you.',
  ],
  class_tomorrow: [
    'Tomorrow at {start}{courseMaybe}. Set the alarm. Respectfully.',
    'Heads up: tomorrow {start}{courseMaybe}. Prepare your brain.',
    "Tomorrow {start}{courseMaybe}. Don't let it jump-scare you.",
    'PSA: tomorrow at {start}{courseMaybe}. Plan like a legend.',
    "Tomorrow's you called. They'd like you to sleep on time. ({start})",
  ],

  // ── Homework ────────────────────────────────────────────────────────
  hw_nodate: [
    "{title} has no due date. That's how assignments sneak-attack you.",
    'Set a due date for {title}. Your future self will thank you.',
    '{title} is floating in the void (no date). Pin it down.',
    '{title} without a due date is just anxiety in disguise.',
    "No due date for {title}. Bold strategy. Let's not test it.",
    "{title} has no date. That's how tasks become legends (and not in a good way).",
    'No due date for {title}. This is how procrastination gets a passport.',
  ],
  hw_many: [
    "You have {count} unfinished homeworks. That's a whole season of content.",
    '{count} homeworks pending. Pick one. Delete it. Repeat.',
    '{count} homeworks waiting. This is not a collectible set.',
    'Mission: reduce homework count from {count} to {countMinusOne}. Start now.',
    '{count} homeworks pending. This is not a personality trait.',
    "Homeworks remaining: {count}. Let's do some subtraction.",
  ],
  hw_all_done: [
    'All homework is done. Who are you and how can we learn your ways?',
    'Homework status: CLEAN. Enjoy the peace.',
    'No pending homework. This is suspiciously responsible.',
    "Homework: 0. You're living the dream.",
  ],
  hw_overdue: [
    "HAVEN'T YOU STARTED {title} YET?? It's {days} day(s) overdue.",
    '{title} is overdue. Future you is not impressed.',
    'Stop procrastinating: {title} was due {days} day(s) ago.',
    "{title} is {days} day(s) late. That's not a flex.",
    'The deadline left without you: {title} ({days} day(s) ago).',
    'Congratulations, you unlocked: OVERDUE MODE. ({title})',
    "We're not saying panic… but {title} is overdue.",
    'Friendly reminder with a tiny scream: {title} is overdue.',
    "{title} is overdue. Let's do damage control, not self-hate.",
    'Overdue: {title}. Step 1: open it. Step 2: do literally anything.',
    '{title} is overdue. We can still clutch. Open it and do ONE thing.',
    'Overdue homework detected. Calm. Open {title}. Tiny progress. Win.',
  ],
  hw_today: [
    'TODAY: {title}. Do it. Now.',
    'Deadline today: {title}{courseMaybe}.',
    '{title} is due today. Quick win?',
    "Today's menu: {title}. Chef, start cooking.",
    'If you do {title} today, tomorrow-you will send a thank-you note.',
    'Today is the day. {title}. No drama, just results.',
    '{title} due today. We can do hard things.',
    'Reminder: {title} is due today. Do it messy, do it done.',
    '{title} due today. A 60% done is still 100% submitted.',
    'Due today: {title}. Your keyboard is about to see things.',
    '{title} due today. This is your montage moment.',
    'Due today: {title}. Enter goblin mode (but submit).',
  ],
  hw_tomorrow: [
    'Due tomorrow: {title}. Do future-you a favor.',
    "{title} is due tomorrow{courseMaybe}. Start now and avoid the 2am arc.",
    "Tomorrow's deadline is approaching: {title}. Begin the ritual.",
    '{title} due tomorrow. One small chunk today = massive relief.',
  ],
  hw_soon: [
    "Haven't you started {title} yet?? Due in {days} day(s).",
    '{title} due in {days} day(s). Tiny steps count.',
    'Reminder: {title}{courseMaybe} due in {days} day(s).',
    "{days} day(s) until {title}. Start with 10 minutes. That's it.",
    'Procrastination called. I declined. Go start {title}.',
    'Reminder: {title} in {days} day(s). Your brain will thank you.',
    '{title} is coming. You can either start now or panic later.',
    'Small progress > big panic. {title} due in {days} day(s).',
    "{title} due in {days} day(s). Open it. Stare at it. That counts as step 1.",
    '{title} due in {days} day(s). Put 10 minutes on the clock and go.',
    '{title} due in {days} day(s). Do a tiny part. Become unstoppable.',
    '{title} is approaching. You still have time. Use it.',
  ],

  // ── Exams ───────────────────────────────────────────────────────────
  exam: [
    'EXAM ALERT: Moed {examType} in {days} day(s){courseMaybe}.',
    'Exam {examType} in {days} day(s){courseMaybe}. Good luck.',
    'Exam {examType} is coming up ({date}){courseMaybe}.',
    'Countdown: {days} day(s) until exam (Moed {examType}){courseMaybe}.',
    'Exam incoming: Moed {examType}{courseMaybe}. Time to become unstoppable.',
    'Moed {examType} in {days} day(s){courseMaybe}. Start with one topic today.',
    'You vs Moed {examType} in {days} day(s){courseMaybe}. Training arc begins.',
    'Reminder: exam {examType} on {date}{courseMaybe}. You got this.',
    "Exam {examType} on {date}{courseMaybe}. Today's plan: one PDF, no chaos.",
    'Exam incoming: {examType} ({date}){courseMaybe}. One page at a time.',
    'Exam in {days} day(s){courseMaybe}. Do one tiny topic today. Win tomorrow.',
    "Exam countdown running{courseMaybe}. Don't let it spawn-camp you.",
  ],
  exam_today: [
    "EXAM TODAY (Moed {examType}){courseMaybe}. Minimal panic. Maximum focus.",
    "Today's boss fight: exam {examType}{courseMaybe}. You've got this.",
    'Exam day{courseMaybe}. Eat. Breathe. Destroy the questions politely.',
  ],
  exam_tomorrow: [
    'Exam tomorrow (Moed {examType}){courseMaybe}. Tonight is for a calm review.',
    'Tomorrow: exam {examType}{courseMaybe}. Sleep is part of the strategy.',
    'Exam tomorrow{courseMaybe}. One last pass, then rest.',
  ],
  exam_soon: [
    'Exam (Moed {examType}) in {days} day(s){courseMaybe}. Boss-fight territory.',
    'EXAM SOON: Moed {examType} in {days} day(s){courseMaybe}. Start with the easiest topic.',
    "Your exam is close: Moed {examType} in {days} day(s){courseMaybe}. No panic. Just a plan.",
    'Exam soon{courseMaybe}. This is where the training arc becomes real.',
  ],

  // ── Recordings ──────────────────────────────────────────────────────
  recordings_backlog: [
    "{count} recordings waiting{courseMaybe}. That's not going to watch itself.",
    'You have {count} unwatched recordings{courseMaybe}. Snack + lecture?',
    'Reminder: {count} recordings to catch up on{courseMaybe}.',
    "{count} recordings{courseMaybe}. Congratulations, you're basically a streaming service.",
    '{count} recordings pending{courseMaybe}. Start one on 1.25x and pretend it\'s cardio.',
    "{count} recordings are waiting{courseMaybe}. Pick one and press play. That's it.",
    'Recordings backlog detected: {count}{courseMaybe}. One today = hero arc.',
  ],
  recordings_big: [
    'Backlog is HUGE ({count}){courseMaybe}. Marathon, not meltdown.',
    "{count} recordings{courseMaybe}. That's a whole Netflix season. Start episode 1.",
    'Ok listen. {count} recordings{courseMaybe}. One today = hero arc.',
    '{count} recordings backlog{courseMaybe}. This is a multi-episode saga. Start chapter 1.',
  ],
  recordings_clear: [
    "Recordings backlog: 0. You're dangerously caught up.",
    'No unwatched recordings. This is elite behavior.',
    'Recordings are all watched. Your future self is cheering.',
  ],

  // ── General fillers ─────────────────────────────────────────────────
  general: [
    "Reminder: you don't need motivation. You need a timer.",
    'If you do 15 minutes now, later-you stops yelling.',
    "Your to-do list isn't scary. It's just loud.",
    'Do the smallest possible version of the task. Still counts.',
    "Open the thing. Name the thing. That's step one.",
    'Tiny progress beats perfect plans.',
    'You can be behind and still make progress today.',
    "Today's strategy: fewer tabs, more output.",
  ],
  general_course_roast: [
    'This course{courseMaybe} is a beautifully engineered obstacle.',
    "Course{courseMaybe}: confidently assigns 6 hours of work like you don't have a life.",
    'Course{courseMaybe} really said "time management" and meant "good luck".',
    "Course{courseMaybe} thinks it's the main character. You're the one doing side quests.",
    'Course{courseMaybe} has the audacity to exist twice a week.',
    'Course{courseMaybe} is a hobby for people who enjoy suffering (respectfully).',
    'Course{courseMaybe}: somehow both important and impossible.',
    'Course{courseMaybe} is teaching resilience. Not on purpose. But still.',
  ],
} as const;
