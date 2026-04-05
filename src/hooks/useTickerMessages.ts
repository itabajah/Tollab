/**
 * useTickerMessages — context-aware message selection for the header ticker.
 *
 * Analyses the current academic state (time, courses, homework, exams,
 * recordings) and returns an array of resolved ticker messages ordered
 * by priority.  The component rotates through them with crossfade.
 *
 * Priority ordering (highest first):
 *   class_now (10) > exam_today/class_soon (9) > hw_overdue/hw_today (8-7)
 *   > hw_many (5) > class_tomorrow/recordings (4) > no_classes_today/
 *   hw_nodate/late_night (3) > all_clear/weekend/no_schedule (2) >
 *   morning/general (1)
 */

import { useMemo } from 'preact/hooks';

import { HEADER_TICKER_TEMPLATES } from '@/constants/ticker-templates';
import { useAppStore } from '@/store/app-store';
import type {
  ExamEntry,
  Semester,
  TickerCategory,
  TickerContext,
  TickerTemplateVars,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:MM" → total minutes from midnight. */
function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === undefined || m === undefined || !Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/** " (courseName)" or "" if blank. */
function courseMaybe(name: string): string {
  const n = name.trim();
  return n ? ` (${n})` : '';
}

/** Parse "YYYY-MM-DD" → midnight-local Date (or null). */
function parseYMD(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** Formatted local "YYYY-MM-DD". */
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** djb2-style hash → uint32, used for deterministic template picking. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic per-day xorshift32 shuffle of template indices. */
function shuffledBag(len: number, seed: number): number[] {
  const bag: number[] = [];
  for (let i = 0; i < len; i++) bag.push(i);

  let x = (seed | 0) || 123456789;
  const rnd = (): number => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return x >>> 0;
  };

  for (let i = bag.length - 1; i > 0; i--) {
    const j = rnd() % (i + 1);
    const tmp = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = tmp;
  }
  return bag;
}

/** Pick a deterministic template from a category, cycling per key + step. */
function pickTemplate(
  category: TickerCategory,
  key: string,
  dailySalt: string,
  step: number,
): string {
  const templates: readonly string[] = HEADER_TICKER_TEMPLATES[category];
  if (templates.length === 0) return '';
  if (templates.length === 1) return templates[0]!;

  const bag = shuffledBag(templates.length, hashStr(`${category}|${dailySalt}|${templates.length}`));
  const base = hashStr(`${category}|${key}`) % bag.length;
  const idx = (base + step) % bag.length;
  return templates[bag[idx]!]!;
}

/** Resolve `{placeholder}` tokens in a template string. */
function resolveTemplate(
  category: TickerCategory,
  vars: TickerTemplateVars,
  key: string,
  dailySalt: string,
  step: number,
): string {
  const tmpl = pickTemplate(category, key, dailySalt, step);
  return tmpl
    .replace(/\{(\w+)\}/g, (_, name: string) => {
      const v = vars[name];
      return v == null ? '' : String(v);
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable pick of one element based on seed. */
function stablePickOne<T>(arr: T[], seed: string): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[hashStr(seed) % arr.length];
}

// ─── Item builders ────────────────────────────────────────────────────────────

function hasAnySchedule(semester: Semester): boolean {
  return semester.courses.some((c) => c.schedule.length > 0);
}

function hasAnyClassToday(semester: Semester, dayOfWeek: number): boolean {
  return semester.courses.some((c) =>
    c.schedule.some((s) => s.day === dayOfWeek),
  );
}

interface ClassPair {
  current: TickerContext | null;
  next: TickerContext | null;
}

function findCurrentAndNextClass(semester: Semester, now: Date): ClassPair {
  let current: (TickerContext & { _slotId?: string }) | null = null;
  let next: (TickerContext & { _slotId?: string; _when?: Date }) | null = null;

  const nowDay = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const course of semester.courses) {
    for (const slot of course.schedule) {
      if (!slot.start || !slot.end || typeof slot.day !== 'number') continue;
      const slotId = `${course.id}:${slot.day}:${slot.start}`;
      const startMin = parseHHMM(slot.start);
      let endMin = parseHHMM(slot.end);
      if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) continue;
      if (endMin <= startMin) endMin += 24 * 60;

      // Current class (±5 min grace)
      if (slot.day === nowDay && nowMin >= startMin - 5 && nowMin <= endMin + 5) {
        current = {
          key: `class_now:${slotId}`,
          kind: 'class',
          badge: 'NOW',
          templateCategory: 'class_now',
          templateVars: {
            course: course.name,
            courseMaybe: courseMaybe(course.name),
            start: slot.start,
            end: slot.end,
          },
          priority: 10,
          _slotId: slotId,
        };
      }

      // Next class today
      if (slot.day === nowDay) {
        const candidate = new Date(now);
        candidate.setSeconds(0, 0);
        const sh = Math.floor(startMin / 60);
        const sm = startMin % 60;
        candidate.setHours(sh, sm, 0, 0);

        if (candidate > now) {
          if (!next || candidate < next._when!) {
            const mins = Math.max(0, Math.round((candidate.getTime() - now.getTime()) / 60_000));
            const templateCategory: TickerCategory = mins <= 15 ? 'class_soon' : 'class_next';
            const badge = mins <= 60 ? 'SOON' : 'NEXT';
            next = {
              key: `class_next:${slotId}`,
              kind: 'class',
              badge,
              templateCategory,
              templateVars: {
                course: course.name,
                courseMaybe: courseMaybe(course.name),
                start: slot.start,
                end: slot.end,
                minutes: String(mins),
              },
              priority: 9,
              _slotId: slotId,
              _when: candidate,
            };
          }
        }
      }
    }
  }

  // Don't show same slot twice
  if (current && next && current._slotId === next._slotId) next = null;
  // Strip helper fields
  if (current) delete current._slotId;
  if (next) { delete next._when; delete next._slotId; }

  return { current, next };
}

function collectTomorrowFirstClass(semester: Semester, now: Date): TickerContext | null {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tDay = tomorrow.getDay();
  let best: (TickerContext & { _when?: Date }) | null = null;

  for (const course of semester.courses) {
    for (const slot of course.schedule) {
      if (!slot.start || typeof slot.day !== 'number' || slot.day !== tDay) continue;
      const startMin = parseHHMM(slot.start);
      if (!Number.isFinite(startMin)) continue;

      const when = new Date(tomorrow);
      when.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

      if (!best || when < best._when!) {
        best = {
          key: `class_tomorrow:${course.id}:${slot.day}:${slot.start}`,
          kind: 'class',
          badge: 'TMRW',
          templateCategory: 'class_tomorrow',
          templateVars: {
            course: course.name,
            courseMaybe: courseMaybe(course.name),
            start: slot.start,
          },
          priority: 4,
          _when: when,
        };
      }
    }
  }

  if (best) delete best._when;
  return best;
}

interface HwCandidate {
  key: string;
  category: TickerCategory;
  badge: string;
  courseId: string;
  courseName: string;
  title: string;
  diffDays: number;
  hwIndex: number;
}

function collectHomeworkItems(
  semester: Semester,
  todayStart: Date,
  seed: string,
  maxItems: number,
): TickerContext[] {
  const all: HwCandidate[] = [];

  for (const course of semester.courses) {
    course.homework.forEach((hw, hwIndex) => {
      if (!hw || hw.completed || !hw.dueDate) return;
      const due = parseYMD(hw.dueDate);
      if (!due) return;
      const dueStart = new Date(due);
      dueStart.setHours(0, 0, 0, 0);
      const diff = Math.ceil((dueStart.getTime() - todayStart.getTime()) / 86_400_000);
      // Only within 7 days
      const category: TickerCategory | null =
        diff < 0 ? 'hw_overdue'
          : diff === 0 ? 'hw_today'
            : diff === 1 ? 'hw_tomorrow'
              : diff <= 7 ? 'hw_soon'
                : null;
      if (!category) return;
      const badge = diff < 0 ? 'HW!' : diff <= 1 ? 'HW!!' : 'HW';
      all.push({
        key: `hw:${course.id}:${hwIndex}:${hw.dueDate}`,
        category,
        badge,
        courseId: course.id,
        courseName: course.name,
        title: hw.title || 'Homework',
        diffDays: diff,
        hwIndex,
      });
    });
  }

  if (all.length === 0) return [];

  const overdue = all.filter((x) => x.diffDays < 0);
  const today = all.filter((x) => x.diffDays === 0);
  const tomorrow = all.filter((x) => x.diffDays === 1);
  const soon = all.filter((x) => x.diffDays >= 2 && x.diffDays <= 7);

  // First pick: most urgent bucket
  const firstPool = overdue.length ? overdue : today.length ? today : tomorrow.length ? tomorrow : soon;
  const first = stablePickOne(firstPool, `${seed}|hw|first`);
  const selected: HwCandidate[] = first ? [first] : [];
  const usedKeys = new Set(selected.map((s) => s.key));

  // Second pick: prefer different course
  if (maxItems > 1 && first) {
    const remaining = all.filter((x) => !usedKeys.has(x.key));
    const diffCourse = remaining.filter((x) => x.courseId !== first.courseId);
    const pool = diffCourse.length > 0 ? diffCourse : remaining;
    const second = stablePickOne(pool, `${seed}|hw|second`);
    if (second) selected.push(second);
  }

  return selected.map((h) => ({
    key: h.key,
    kind: 'homework' as const,
    badge: h.badge,
    templateCategory: h.category,
    templateVars: {
      title: h.title,
      course: h.courseName,
      courseMaybe: courseMaybe(h.courseName),
      days: String(Math.abs(h.diffDays)),
    },
    priority: h.category === 'hw_overdue' ? 8 : h.category === 'hw_today' ? 8 : 7,
  }));
}

function collectHomeworkVolumeNudge(semester: Semester): TickerContext | null {
  let count = 0;
  for (const course of semester.courses) {
    for (const hw of course.homework) {
      if (hw && !hw.completed) count++;
    }
  }
  if (count < 6) return null;
  return {
    key: `hw_many:${count}`,
    kind: 'info',
    badge: 'HW+',
    templateCategory: 'hw_many',
    templateVars: {
      count: String(count),
      countMinusOne: String(Math.max(0, count - 1)),
    },
    priority: 5,
  };
}

function collectHomeworkNoDueDate(semester: Semester): TickerContext | null {
  for (const course of semester.courses) {
    for (let i = 0; i < course.homework.length; i++) {
      const hw = course.homework[i];
      if (!hw || hw.completed || hw.dueDate) continue;
      return {
        key: `hw_nodate:${course.id}:${i}`,
        kind: 'homework',
        badge: 'HW',
        templateCategory: 'hw_nodate',
        templateVars: {
          title: hw.title || 'Homework',
          course: course.name,
          courseMaybe: courseMaybe(course.name),
        },
        priority: 3,
      };
    }
  }
  return null;
}

function collectHomeworkAllDone(semester: Semester): TickerContext | null {
  let total = 0;
  let remaining = 0;
  for (const course of semester.courses) {
    for (const hw of course.homework) {
      if (!hw) continue;
      total++;
      if (!hw.completed) remaining++;
    }
  }
  if (total <= 0 || remaining > 0) return null;
  return {
    key: 'hw_all_done',
    kind: 'info',
    badge: 'NICE',
    templateCategory: 'hw_all_done',
    templateVars: {},
    priority: 2,
  };
}

interface ExamCandidate {
  key: string;
  badge: string;
  templateCategory: TickerCategory;
  templateVars: TickerTemplateVars;
  courseId: string;
  when: Date;
}

function collectExamItems(
  semester: Semester,
  todayStart: Date,
  seed: string,
  _maxItems: number,
): TickerContext[] {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const all: ExamCandidate[] = [];

  for (const course of semester.courses) {
    const exams: ExamEntry = course.exams;
    const candidates: { examType: string; dateStr: string }[] = [
      { examType: 'A', dateStr: exams.moedA },
      { examType: 'B', dateStr: exams.moedB },
    ];
    for (const c of candidates) {
      if (!c.dateStr) continue;
      const examDate = parseYMD(c.dateStr);
      if (!examDate) continue;
      const examStart = new Date(examDate);
      examStart.setHours(0, 0, 0, 0);
      const diff = Math.ceil((examStart.getTime() - todayStart.getTime()) / 86_400_000);
      if (diff < 0 || diff > 14) continue;
      const badge = diff === 0 ? 'EXAM!!' : diff <= 3 ? 'EXAM!' : 'EXAM';
      const category: TickerCategory =
        diff === 0 ? 'exam_today'
          : diff === 1 ? 'exam_tomorrow'
            : diff <= 3 ? 'exam_soon'
              : 'exam';
      all.push({
        key: `exam:${course.id}:${c.examType}:${c.dateStr}`,
        badge,
        templateCategory: category,
        templateVars: {
          course: course.name,
          courseMaybe: courseMaybe(course.name),
          examType: c.examType,
          days: String(diff),
          date: dateFormatter.format(examStart),
        },
        courseId: course.id,
        when: examStart,
      });
    }
  }

  all.sort((a, b) => a.when.getTime() - b.when.getTime());

  // If exam today/tomorrow, always show that
  const urgent = all.filter((e) => e.badge === 'EXAM!!');
  if (urgent.length > 0) {
    return urgent.slice(0, 1).map((e) => ({
      key: e.key,
      kind: 'exam' as const,
      badge: e.badge,
      templateCategory: e.templateCategory,
      templateVars: e.templateVars,
      priority: 9,
    }));
  }

  const window = all.slice(0, Math.min(4, all.length));
  const picked = stablePickOne(window, `${seed}|exam|pick`);
  const final = picked ? [picked] : window.slice(0, 1);
  return final.map((e) => ({
    key: e.key,
    kind: 'exam' as const,
    badge: e.badge,
    templateCategory: e.templateCategory,
    templateVars: e.templateVars,
    priority: 9,
  }));
}

function collectRecordingsBacklog(semester: Semester): TickerContext | null {
  let best: { key: string; badge: string; category: TickerCategory; vars: TickerTemplateVars; backlog: number } | null = null;

  for (const course of semester.courses) {
    const tabs = course.recordings?.tabs;
    if (!Array.isArray(tabs)) continue;
    let backlog = 0;
    for (const tab of tabs) {
      for (const item of tab.items) {
        if (item && item.watched === false) backlog++;
      }
    }
    if (backlog <= 0) continue;
    if (!best || backlog > best.backlog) {
      const category: TickerCategory = backlog >= 10 ? 'recordings_big' : 'recordings_backlog';
      best = {
        key: `recordings_backlog:${course.id}:${backlog}`,
        badge: backlog >= 10 ? 'REC!' : 'REC',
        category,
        vars: {
          course: course.name,
          courseMaybe: courseMaybe(course.name),
          count: String(backlog),
        },
        backlog,
      };
    }
  }

  if (!best) return null;
  return {
    key: best.key,
    kind: 'recordings',
    badge: best.badge,
    templateCategory: best.category,
    templateVars: best.vars,
    priority: 4,
  };
}

function collectRecordingsAllCaughtUp(semester: Semester): TickerContext | null {
  let total = 0;
  let backlog = 0;
  for (const course of semester.courses) {
    const tabs = course.recordings?.tabs;
    if (!Array.isArray(tabs)) continue;
    for (const tab of tabs) {
      for (const it of tab.items) {
        if (!it) continue;
        total++;
        if (it.watched === false) backlog++;
      }
    }
  }
  if (total <= 0 || backlog > 0) return null;
  return {
    key: 'recordings_clear',
    kind: 'info',
    badge: 'NICE',
    templateCategory: 'recordings_clear',
    templateVars: {},
    priority: 2,
  };
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/** Build the full ordered list of ticker items for the current state. */
function buildTickerItems(semester: Semester | undefined, now: Date, seed: string): TickerContext[] {
  if (!semester) {
    return [{ key: 'no_semester', kind: 'info', badge: 'SETUP', templateCategory: 'no_semester', templateVars: {}, priority: 1 }];
  }
  if (semester.courses.length === 0) {
    return [{ key: 'no_courses', kind: 'info', badge: 'SETUP', templateCategory: 'no_courses', templateVars: {}, priority: 1 }];
  }

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const hour = now.getHours();
  const items: TickerContext[] = [];
  const scheduleExists = hasAnySchedule(semester);

  // 1) Classes: current + next (highest priority)
  const { current: currentClass, next: nextClass } = findCurrentAndNextClass(semester, now);
  if (currentClass) items.push(currentClass);
  if (nextClass) items.push(nextClass);

  // 1.5) Tomorrow's first class (only when no classes left today)
  if (!currentClass && !nextClass) {
    const tmrw = collectTomorrowFirstClass(semester, now);
    if (tmrw) items.push(tmrw);
  }

  // 1.75) No schedule at all
  if (!scheduleExists) {
    items.push({ key: 'no_schedule', kind: 'info', badge: 'SETUP', templateCategory: 'no_schedule', templateVars: {}, priority: 2 });
  }

  // 2) Homework: up to 2 most urgent
  const hwItems = collectHomeworkItems(semester, todayStart, seed, 2);
  items.push(...hwItems);

  // 2.5) Homework volume nudge (6+ pending)
  const hwMany = collectHomeworkVolumeNudge(semester);
  if (hwMany) items.push(hwMany);

  // 3) Exams: soonest upcoming
  const examItems = collectExamItems(semester, todayStart, seed, 1);
  items.push(...examItems);

  // 4) Homework without due date
  const noDateHw = collectHomeworkNoDueDate(semester);
  if (noDateHw) items.push(noDateHw);

  // 5) Recordings backlog
  const recBacklog = collectRecordingsBacklog(semester);
  if (recBacklog) items.push(recBacklog);

  // 5.5) Positive states — only when nothing actionable
  const hasUrgentHw = hwItems.length > 0 || !!noDateHw || !!hwMany;
  const hasExam = examItems.length > 0;
  const hasRecBacklog = !!recBacklog;

  if (!currentClass && !nextClass && !hasUrgentHw && !hasExam && !hasRecBacklog) {
    const hwDone = collectHomeworkAllDone(semester);
    if (hwDone) items.push(hwDone);
    const recClear = collectRecordingsAllCaughtUp(semester);
    if (recClear) items.push(recClear);
  }

  // 6) No classes today (not during late night)
  const isLateNight = hour >= 23 || hour < 6;
  if (scheduleExists && !currentClass && !nextClass && !hasAnyClassToday(semester, now.getDay()) && !isLateNight) {
    items.push({ key: 'no_classes_today', kind: 'info', badge: 'FREE', templateCategory: 'no_classes_today', templateVars: {}, priority: 3 });
  }

  // 7) Time-of-day vibes (only when no urgent actionable items)
  const hasUrgentActionable = items.some((i) => i.priority >= 7);
  if (!hasUrgentActionable) {
    const day = now.getDay();
    const timeStr = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Late night: 11pm–4am (23:00–04:00)
    if (hour >= 23 || hour <= 4) {
      items.push({ key: `late_night:${hour}`, kind: 'info', badge: 'ZZZ', templateCategory: 'late_night', templateVars: { time: timeStr }, priority: 3 });
    }
    // Weekend: Friday 5pm+, all Saturday, Sunday until 6pm
    else if (day === 6 || (day === 5 && hour >= 17) || (day === 0 && hour < 18)) {
      items.push({ key: `weekend:${day}`, kind: 'info', badge: 'WEEKEND', templateCategory: 'weekend', templateVars: {}, priority: 2 });
    }
    // Morning: 5am–10am
    else if (hour >= 5 && hour < 10) {
      items.push({ key: `morning:${hour}`, kind: 'info', badge: 'AM', templateCategory: 'morning', templateVars: {}, priority: 1 });
    }
  }

  // 8) General fillers (only when few items)
  if (items.length < 3 && semester.courses.length > 0) {
    const general = collectGeneralItems(semester, now);
    const maxGeneral = items.length === 0 ? 2 : 1;
    items.push(...general.slice(0, maxGeneral));
  }

  // De-dupe by key
  const seen = new Set<string>();
  const deduped: TickerContext[] = [];
  for (const it of items) {
    if (!it.key) continue;
    const hasTemplate = HEADER_TICKER_TEMPLATES[it.templateCategory].length > 0;
    const hasText = !!it.text?.trim();
    if (!hasTemplate && !hasText) continue;
    if (seen.has(it.key)) continue;
    seen.add(it.key);
    deduped.push(it);
  }

  if (deduped.length === 0) {
    return [{ key: 'all_clear', kind: 'info', badge: 'OK', templateCategory: 'all_clear', templateVars: {}, priority: 1 }];
  }

  // Sort by priority descending
  deduped.sort((a, b) => b.priority - a.priority);
  return deduped;
}

function collectGeneralItems(semester: Semester, now: Date): TickerContext[] {
  const ymd = toYMD(now);
  const out: TickerContext[] = [];

  // Course roast of the day (stable per day)
  const courses = semester.courses.filter((c) => c.id);
  if (courses.length > 0) {
    const idx = hashStr(`roast|${ymd}`) % courses.length;
    const course = courses[idx]!;
    out.push({
      key: `general_course_roast:${course.id}:${ymd}`,
      kind: 'info',
      badge: 'VIBE',
      templateCategory: 'general_course_roast',
      templateVars: {
        course: course.name,
        courseMaybe: courseMaybe(course.name),
      },
      priority: 1,
    });
  }

  // General reminder
  out.push({
    key: `general:${ymd}`,
    kind: 'info',
    badge: 'NOTE',
    templateCategory: 'general',
    templateVars: {},
    priority: 1,
  });

  return out;
}

// ─── Resolved message type ────────────────────────────────────────────────────

/** A fully resolved ticker message ready for display. */
export interface TickerMessage {
  /** The resolved human-readable text. */
  text: string;
  /** Badge label (e.g. "NOW", "HW!", "EXAM"). */
  badge: string;
  /** Stable dedup key. */
  key: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Build context-aware ticker messages from the current app state.
 *
 * Returns a stable array of resolved `TickerMessage` objects ordered by
 * descending priority.  The component simply rotates through them.
 *
 * The messages are re-computed whenever the store data changes (semester,
 * courses, homework, exams, recordings) but the template shuffle stays
 * stable within a day so messages don't flicker.
 */
export function useTickerMessages(): TickerMessage[] {
  const semester = useAppStore((s) =>
    s.semesters.find((sem) => sem.id === s.currentSemesterId),
  );

  return useMemo(() => {
    const now = new Date();
    // Seed rotates every 15 minutes (matching legacy behaviour)
    const ymd = toYMD(now);
    const bucket = Math.floor(now.getTime() / (1000 * 60 * 15));
    const seed = `${ymd}|${bucket}|${now.getHours()}`;

    const items = buildTickerItems(semester, now, seed);
    const dailySalt = ymd;

    return items.map((item, idx) => ({
      text: item.text?.trim()
        ? item.text
        : resolveTemplate(item.templateCategory, item.templateVars, item.key, dailySalt, idx),
      badge: item.badge,
      key: item.key,
    }));
  }, [semester]);
}
