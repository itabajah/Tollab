import { appDataSchema, createEmptyAppData, VALIDATION_LIMITS, type AppData } from '@/domain/model'
import { newId } from '@/domain/ids'
import { STORAGE_KEYS, LEGACY_KEYS, legacyProfileKey, profileKey } from './keys'
import { saveProfileData, saveProfiles, saveActiveProfileId, type StorageLike } from './localStore'

/**
 * One-time migration from the legacy app's localStorage layout:
 *   tollab_profiles / tollab_active / tollab_<profileId>
 * Profile blobs come in two flavors:
 *   - compact v2 ({v:2, t, s, d} with short keys, defaults omitted)
 *   - legacy v1 (full field names, possibly missing fields, courses may still
 *     have a `lectures[]` array predating the recordings model)
 * Migration is lenient: strings are truncated to schema limits, invalid
 * sub-items are dropped, and only structurally hopeless profiles are skipped.
 * Legacy keys are never deleted (rollback safety).
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

type Dict = Record<string, unknown>

const isDict = (x: unknown): x is Dict => typeof x === 'object' && x !== null && !Array.isArray(x)
const asArray = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])

function str(x: unknown, max: number, fallback = ''): string {
  if (typeof x === 'string') return x.slice(0, max)
  if (typeof x === 'number' && Number.isFinite(x)) return String(x).slice(0, max)
  return fallback
}

function requiredStr(x: unknown, max: number, fallback: string): string {
  const value = str(x, max)
  return value.length > 0 ? value : fallback
}

const ymdOrEmpty = (x: unknown): string => (typeof x === 'string' && YMD.test(x) ? x : '')
const bool = (x: unknown): boolean => Boolean(x)

function intInRange(x: unknown, min: number, max: number, fallback: number): number {
  return typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : fallback
}

function sanitizeCalendarSettings(cal: unknown): Dict {
  const c = isDict(cal) ? cal : {}
  const days = asArray(c.visibleDays).filter(
    (d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6,
  )
  return {
    startHour: intInRange(c.startHour, 0, 23, 8),
    endHour: intInRange(c.endHour, 1, 24, 20),
    visibleDays: Array.isArray(c.visibleDays) && days.length > 0 ? days : [0, 1, 2, 3, 4, 5],
  }
}

function sanitizeScheduleSlots(slots: unknown[]): Dict[] {
  const out: Dict[] = []
  for (const raw of slots) {
    if (!isDict(raw)) continue
    const day = raw.day
    const start = raw.start
    const end = raw.end
    if (
      typeof day === 'number' &&
      Number.isInteger(day) &&
      day >= 0 &&
      day <= 6 &&
      typeof start === 'string' &&
      HHMM.test(start) &&
      typeof end === 'string' &&
      HHMM.test(end)
    ) {
      out.push({ day, start, end })
    }
  }
  return out
}

function sanitizeHomework(items: unknown[]): Dict[] {
  return items.filter(isDict).map((h) => ({
    id: newId(),
    title: requiredStr(h.title, VALIDATION_LIMITS.HOMEWORK_TITLE_MAX, 'Untitled'),
    dueDate: ymdOrEmpty(h.dueDate),
    completed: bool(h.completed),
    notes: str(h.notes, VALIDATION_LIMITS.NOTES_MAX),
    links: asArray(h.links)
      .filter(isDict)
      .filter((l) => typeof l.url === 'string' && l.url.length > 0)
      .map((l) => ({
        label: str(l.label, 200),
        url: str(l.url, VALIDATION_LIMITS.URL_MAX),
      })),
  }))
}

function sanitizeRecordingItems(items: unknown[]): Dict[] {
  return items.filter(isDict).map((r) => ({
    id: newId(),
    name: str(r.name, 300),
    videoLink: str(r.videoLink, VALIDATION_LIMITS.URL_MAX),
    slideLink: str(r.slideLink, VALIDATION_LIMITS.URL_MAX),
    watched: bool(r.watched),
  }))
}

/** Ensures lectures + tutorials exist, in that order at the front. */
function withProtectedTabs(tabs: Dict[]): Dict[] {
  const result = [...tabs]
  if (!result.some((t) => t.id === 'lectures')) {
    result.unshift({ id: 'lectures', name: 'Lectures', items: [] })
  }
  if (!result.some((t) => t.id === 'tutorials')) {
    const lecturesIndex = result.findIndex((t) => t.id === 'lectures')
    result.splice(lecturesIndex + 1, 0, { id: 'tutorials', name: 'Tutorials', items: [] })
  }
  return result
}

function sanitizeRecordingTabs(tabs: unknown[]): Dict[] {
  const cleaned = tabs.filter(isDict).map((t) => ({
    id: requiredStr(t.id, 100, newId()),
    name: requiredStr(t.name, 50, 'Tab'),
    items: sanitizeRecordingItems(asArray(t.items)),
  }))
  return withProtectedTabs(cleaned)
}

function sanitizeCustomExams(exams: unknown[]): Dict[] {
  return exams
    .filter(isDict)
    .filter((e) => typeof e.date === 'string' && YMD.test(e.date))
    .map((e) => ({
      id: requiredStr(e.id, 100, newId()),
      name: requiredStr(e.name, VALIDATION_LIMITS.COURSE_NAME_MAX, 'Exam'),
      label: str(e.label, VALIDATION_LIMITS.CUSTOM_EXAM_LABEL_MAX),
      date: e.date,
      color: str(e.color, 100),
    }))
}

function sanitizeSettings(s: unknown): Dict {
  const raw = isDict(s) ? s : {}
  const out: Dict = {}
  if (raw.theme === 'dark' || raw.theme === 'light') out.theme = raw.theme
  if (raw.colorTheme === 'colorful' || raw.colorTheme === 'single' || raw.colorTheme === 'mono') {
    out.colorTheme = raw.colorTheme
  }
  if (typeof raw.baseColorHue === 'number' && Number.isFinite(raw.baseColorHue)) {
    out.baseColorHue = Math.min(360, Math.max(0, raw.baseColorHue))
  }
  if (typeof raw.showCompleted === 'boolean') out.showCompleted = raw.showCompleted
  if (typeof raw.showWatchedRecordings === 'boolean') {
    out.showWatchedRecordings = raw.showWatchedRecordings
  }
  return out
}

// ---------------------------------------------------------------------------
// Compact v2 decoding (mirror of the legacy hydrateFromStorage)
// ---------------------------------------------------------------------------

function decodeCompactV2Course(c: Dict): Dict {
  return {
    id: requiredStr(c.i, 100, newId()),
    name: requiredStr(c.n, VALIDATION_LIMITS.COURSE_NAME_MAX, 'Untitled Course'),
    color: str(c.cl, 100, 'hsl(0, 45%, 50%)') || 'hsl(0, 45%, 50%)',
    number: str(c.num, 20),
    points: str(c.pts, 10),
    lecturer: str(c.lec, 200),
    faculty: str(c.fac, 200),
    location: str(c.loc, 200),
    grade: str(c.gr, 10),
    syllabus: str(c.syl, VALIDATION_LIMITS.URL_MAX),
    notes: str(c.nt, VALIDATION_LIMITS.NOTES_MAX),
    exams: {
      moedA: ymdOrEmpty(isDict(c.ex) ? c.ex.a : ''),
      moedB: ymdOrEmpty(isDict(c.ex) ? c.ex.b : ''),
    },
    schedule: sanitizeScheduleSlots(
      asArray(c.sch).map((s) => (Array.isArray(s) ? { day: s[0], start: s[1], end: s[2] } : s)),
    ),
    homework: sanitizeHomework(
      asArray(c.hw)
        .filter(isDict)
        .map((h) => ({
          title: h.t,
          dueDate: h.d,
          completed: h.c,
          notes: h.n,
          links: asArray(h.l)
            .filter(Array.isArray)
            .map((l) => ({ label: l[0], url: l[1] })),
        })),
    ),
    recordings: {
      tabs: sanitizeRecordingTabs(
        asArray(c.rec)
          .filter(isDict)
          .map((t) => ({
            id: t.i,
            name: t.n,
            items: asArray(t.it)
              .filter(isDict)
              .map((r) => ({ name: r.n, videoLink: r.v, slideLink: r.s, watched: r.w })),
          })),
      ),
    },
  }
}

function decodeCompactV2(compact: Dict): Dict {
  const settings = isDict(compact.s) ? compact.s : {}
  return {
    lastModified: str(compact.t, 100) || new Date().toISOString(),
    settings: sanitizeSettings({
      theme: settings.th,
      colorTheme: settings.ct,
      baseColorHue: settings.bh,
      showCompleted: settings.sc,
      showWatchedRecordings: settings.sw,
    }),
    semesters: asArray(compact.d)
      .filter(isDict)
      .map((s) => {
        const cal = isDict(s.cal) ? s.cal : {}
        return {
          id: requiredStr(s.i, 100, newId()),
          name: requiredStr(s.n, VALIDATION_LIMITS.SEMESTER_NAME_MAX, 'Unnamed'),
          calendarSettings: sanitizeCalendarSettings({
            startHour: cal.sh,
            endHour: cal.eh,
            visibleDays: cal.vd,
          }),
          examViewMode: s.vm === 'semester' || s.vm === 'exam' ? s.vm : 'auto',
          hiddenExamIds: asArray(s.hx).filter((x): x is string => typeof x === 'string'),
          customExams: sanitizeCustomExams(
            asArray(s.cx)
              .filter(isDict)
              .map((e) => ({ id: e.i, name: e.n, label: e.l, date: e.d, color: e.c })),
          ),
          courses: asArray(s.c).filter(isDict).map(decodeCompactV2Course),
        }
      }),
  }
}

// ---------------------------------------------------------------------------
// Legacy v1 decoding (mirror of the legacy migrateData/migrateCourse)
// ---------------------------------------------------------------------------

function decodeLegacyV1Course(c: Dict): Dict {
  let tabs: Dict[]
  if (isDict(c.recordings) && Array.isArray(c.recordings.tabs)) {
    tabs = sanitizeRecordingTabs(c.recordings.tabs)
  } else {
    // Pre-recordings era: course.lectures[] becomes the Lectures tab.
    tabs = [
      { id: 'lectures', name: 'Lectures', items: sanitizeRecordingItems(asArray(c.lectures)) },
      { id: 'tutorials', name: 'Tutorials', items: [] },
    ]
  }
  return {
    id: requiredStr(c.id, 100, newId()),
    name: requiredStr(c.name, VALIDATION_LIMITS.COURSE_NAME_MAX, 'Untitled Course'),
    color: str(c.color, 100) || 'hsl(0, 45%, 50%)',
    number: str(c.number, 20),
    points: str(c.points, 10),
    lecturer: str(c.lecturer, 200),
    faculty: str(c.faculty, 200),
    location: str(c.location, 200),
    grade: str(c.grade, 10),
    syllabus: str(c.syllabus, VALIDATION_LIMITS.URL_MAX),
    notes: str(c.notes, VALIDATION_LIMITS.NOTES_MAX),
    exams: {
      moedA: ymdOrEmpty(isDict(c.exams) ? c.exams.moedA : ''),
      moedB: ymdOrEmpty(isDict(c.exams) ? c.exams.moedB : ''),
    },
    schedule: sanitizeScheduleSlots(asArray(c.schedule)),
    homework: sanitizeHomework(asArray(c.homework)),
    recordings: { tabs },
  }
}

function decodeLegacyV1(raw: Dict): Dict {
  return {
    lastModified: str(raw.lastModified, 100) || new Date().toISOString(),
    settings: sanitizeSettings(raw.settings),
    semesters: asArray(raw.semesters)
      .filter(isDict)
      .map((s) => ({
        id: requiredStr(s.id, 100, newId()),
        name: requiredStr(s.name, VALIDATION_LIMITS.SEMESTER_NAME_MAX, 'Unnamed'),
        calendarSettings: sanitizeCalendarSettings(s.calendarSettings),
        examViewMode:
          s.examViewMode === 'semester' || s.examViewMode === 'exam' ? s.examViewMode : 'auto',
        hiddenExamIds: asArray(s.hiddenExamIds).filter((x): x is string => typeof x === 'string'),
        customExams: sanitizeCustomExams(asArray(s.customExams)),
        courses: asArray(s.courses).filter(isDict).map(decodeLegacyV1Course),
      })),
  }
}

/**
 * Decodes any legacy profile blob (compact v2 or plain v1) into valid AppData.
 * Returns null only for structurally hopeless input.
 */
export function decodeLegacyProfile(raw: unknown): AppData | null {
  if (!isDict(raw)) return null
  try {
    const candidate =
      typeof raw.v === 'number' && raw.v >= 2 ? decodeCompactV2(raw) : decodeLegacyV1(raw)
    const result = appDataSchema.safeParse(candidate)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Storage-level migration
// ---------------------------------------------------------------------------

export interface MigrationReport {
  alreadyDone: boolean
  migrated: string[]
  skipped: Array<{ id: string; reason: string }>
}

export function migrateLegacyStorage(storage: StorageLike): MigrationReport {
  const report: MigrationReport = { alreadyDone: false, migrated: [], skipped: [] }

  if (storage.getItem(STORAGE_KEYS.MIGRATED) !== null) {
    report.alreadyDone = true
    return report
  }

  const finish = () => {
    storage.setItem(STORAGE_KEYS.MIGRATED, new Date().toISOString())
    return report
  }

  const legacyProfilesRaw = storage.getItem(LEGACY_KEYS.PROFILES)
  if (legacyProfilesRaw === null) return finish()

  let legacyProfiles: Array<{ id: string; name: string }>
  try {
    const parsed: unknown = JSON.parse(legacyProfilesRaw)
    legacyProfiles = asArray(parsed)
      .filter(isDict)
      .filter((p) => typeof p.id === 'string' && p.id.length > 0)
      .map((p) => ({
        id: p.id as string,
        name: requiredStr(p.name, VALIDATION_LIMITS.PROFILE_NAME_MAX, 'Profile'),
      }))
  } catch {
    return finish()
  }
  if (legacyProfiles.length === 0) return finish()

  for (const profile of legacyProfiles) {
    if (storage.getItem(profileKey(profile.id)) !== null) continue // never clobber v3 data

    const rawBlob = storage.getItem(legacyProfileKey(profile.id))
    if (rawBlob === null) {
      const empty = createEmptyAppData(new Date().toISOString())
      saveProfileData(storage, profile.id, empty, empty.lastModified)
      report.migrated.push(profile.id)
      continue
    }

    let parsedBlob: unknown
    try {
      parsedBlob = JSON.parse(rawBlob)
    } catch {
      report.skipped.push({ id: profile.id, reason: 'unparseable JSON' })
      continue
    }

    const data = decodeLegacyProfile(parsedBlob)
    if (data === null) {
      report.skipped.push({ id: profile.id, reason: 'unrecognized data shape' })
      continue
    }

    saveProfileData(storage, profile.id, data, data.lastModified)
    report.migrated.push(profile.id)
  }

  saveProfiles(storage, legacyProfiles)

  const legacyActive = storage.getItem(LEGACY_KEYS.ACTIVE)
  const active = legacyProfiles.some((p) => p.id === legacyActive)
    ? (legacyActive as string)
    : legacyProfiles[0]!.id
  saveActiveProfileId(storage, active)

  return finish()
}
