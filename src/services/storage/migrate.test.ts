import v2Full from './__fixtures__/v2-compact-full.json'
import v2Minimal from './__fixtures__/v2-compact-minimal.json'
import v1Legacy from './__fixtures__/v1-legacy.json'
import { decodeLegacyProfile, migrateLegacyStorage } from './migrate'
import { decodeStoredProfile } from './codec'
import { STORAGE_KEYS, LEGACY_KEYS, profileKey, legacyProfileKey } from './keys'
import { createMemoryStorage } from './localStore'

describe('decodeLegacyProfile — compact v2', () => {
  const data = decodeLegacyProfile(v2Full)
  if (!data) throw new Error('expected v2 fixture to decode')

  it('restores settings from short keys', () => {
    expect(data.settings).toEqual({
      theme: 'dark',
      colorTheme: 'single',
      baseColorHue: 260,
      showCompleted: false,
      showWatchedRecordings: false,
    })
    expect(data.lastModified).toBe('2026-01-10T12:00:00.000Z')
  })

  it('restores semester, calendar and exam-mode fields', () => {
    const sem = data.semesters[0]!
    expect(sem.id).toBe('sem_w25')
    expect(sem.name).toBe('Winter 2025-2026')
    expect(sem.calendarSettings).toEqual({
      startHour: 9,
      endHour: 18,
      visibleDays: [0, 1, 2, 3, 4],
    })
    expect(sem.examViewMode).toBe('exam')
    expect(sem.hiddenExamIds).toEqual(['c_algo:B'])
    expect(sem.customExams).toEqual([
      {
        id: 'cx1',
        name: 'Physics Quiz',
        date: '2026-02-10',
        label: 'Quiz',
        color: 'hsl(30, 45%, 50%)',
      },
    ])
  })

  it('restores a fully-populated course', () => {
    const course = data.semesters[0]!.courses[0]!
    expect(course).toMatchObject({
      id: 'c_algo',
      name: 'Algorithms 1',
      color: 'hsl(137, 45%, 50%)',
      number: '234247',
      points: '3',
      lecturer: 'Prof. Cohen',
      faculty: 'Computer Science',
      location: 'Taub 2',
      grade: '92',
      syllabus: 'https://example.com/syllabus',
      notes: 'hard course',
      exams: { moedA: '2026-02-01', moedB: '2026-03-01' },
    })
    expect(course.schedule).toEqual([
      { day: 0, start: '10:30', end: '12:30' },
      { day: 2, start: '14:30', end: '15:30' },
    ])
  })

  it('restores homework with generated ids and defaults', () => {
    const [hw1, hw2] = data.semesters[0]!.courses[0]!.homework
    expect(hw1).toMatchObject({
      title: 'Wet 1',
      dueDate: '2026-01-20',
      completed: true,
      notes: 'graphs',
      links: [{ label: 'Link 1', url: 'https://example.com/hw1' }],
    })
    expect(hw1!.id).toBeTruthy()
    expect(hw2).toMatchObject({ title: 'Wet 2', dueDate: '', completed: false, links: [] })
    expect(hw2!.id).not.toBe(hw1!.id)
  })

  it('restores recordings, re-adding missing protected tabs', () => {
    const tabs = data.semesters[0]!.courses[0]!.recordings.tabs
    // fixture had lectures + custom; tutorials must be re-inserted after lectures
    expect(tabs.map((t) => t.id)).toEqual(['lectures', 'tutorials', 'custom_x1'])
    const lecture1 = tabs[0]!.items[0]!
    expect(lecture1).toMatchObject({
      name: 'Lecture 1',
      videoLink: 'https://www.youtube.com/watch?v=abc',
      slideLink: 'https://example.com/slides1',
      watched: true,
    })
    expect(lecture1.id).toBeTruthy()
    expect(tabs[0]!.items[1]!.watched).toBe(false)
  })

  it('fills full defaults for a minimal course', () => {
    const bare = data.semesters[0]!.courses[1]!
    expect(bare.name).toBe('Calculus 2m')
    expect(bare.exams).toEqual({ moedA: '', moedB: '' })
    expect(bare.recordings.tabs.map((t) => t.id)).toEqual(['lectures', 'tutorials'])
    expect(bare.homeworkSort).toBe('date_asc')
  })

  it('decodes a minimal v2 payload', () => {
    const minimal = decodeLegacyProfile(v2Minimal)
    expect(minimal).not.toBeNull()
    expect(minimal!.semesters).toEqual([])
    expect(minimal!.settings.theme).toBe('light')
    expect(minimal!.lastModified).toBe('2025-11-01T08:00:00.000Z')
  })
})

describe('decodeLegacyProfile — legacy v1 (plain shape)', () => {
  const data = decodeLegacyProfile(v1Legacy)
  if (!data) throw new Error('expected v1 fixture to decode')

  it('migrates course.lectures[] into the lectures recording tab', () => {
    const course = data.semesters[0]!.courses[0]!
    const lecturesTab = course.recordings.tabs.find((t) => t.id === 'lectures')!
    expect(lecturesTab.items).toHaveLength(2)
    expect(lecturesTab.items[0]).toMatchObject({
      name: 'Intro',
      videoLink: 'https://www.youtube.com/watch?v=xyz',
      watched: true,
      slideLink: '',
    })
  })

  it('keeps settings and fills missing defaults', () => {
    expect(data.settings.theme).toBe('dark')
    expect(data.settings.colorTheme).toBe('colorful')
    expect(data.semesters[0]!.examViewMode).toBe('auto')
  })

  it('stamps a lastModified when missing', () => {
    expect(typeof data.lastModified).toBe('string')
    expect(data.lastModified.length).toBeGreaterThan(0)
  })
})

describe('decodeLegacyProfile — resilience', () => {
  it('returns null for structurally hopeless input', () => {
    expect(decodeLegacyProfile(null)).toBeNull()
    expect(decodeLegacyProfile('a string')).toBeNull()
    expect(decodeLegacyProfile(42)).toBeNull()
  })

  it('truncates over-long strings instead of failing', () => {
    const data = decodeLegacyProfile({
      semesters: [
        {
          id: 's',
          name: 'S'.repeat(80),
          courses: [{ id: 'c', name: 'N'.repeat(300), notes: 'x'.repeat(6000) }],
        },
      ],
    })
    expect(data).not.toBeNull()
    expect(data!.semesters[0]!.name).toHaveLength(50)
    expect(data!.semesters[0]!.courses[0]!.name).toHaveLength(100)
    expect(data!.semesters[0]!.courses[0]!.notes).toHaveLength(5000)
  })

  it('drops custom exams with invalid dates rather than failing', () => {
    const data = decodeLegacyProfile({
      v: 2,
      t: '2026-01-01T00:00:00.000Z',
      d: [{ i: 's', n: 'Sem', c: [], cx: [{ i: 'x', n: 'Broken', d: '' }] }],
    })
    expect(data!.semesters[0]!.customExams).toEqual([])
  })
})

describe('migrateLegacyStorage', () => {
  function seedLegacy(storage: ReturnType<typeof createMemoryStorage>) {
    storage.setItem(
      LEGACY_KEYS.PROFILES,
      JSON.stringify([
        { id: 'default', name: 'Default' },
        { id: 'p2', name: 'Second' },
      ]),
    )
    storage.setItem(LEGACY_KEYS.ACTIVE, 'p2')
    storage.setItem(legacyProfileKey('default'), JSON.stringify(v2Full))
    storage.setItem(legacyProfileKey('p2'), JSON.stringify(v1Legacy))
  }

  it('migrates all legacy profiles to v3 keys and preserves the active profile', () => {
    const storage = createMemoryStorage()
    seedLegacy(storage)

    const report = migrateLegacyStorage(storage)

    expect(report.alreadyDone).toBe(false)
    expect(report.migrated).toEqual(['default', 'p2'])
    expect(report.skipped).toEqual([])

    const profiles = JSON.parse(storage.getItem(STORAGE_KEYS.PROFILES)!)
    expect(profiles).toEqual([
      { id: 'default', name: 'Default' },
      { id: 'p2', name: 'Second' },
    ])
    expect(storage.getItem(STORAGE_KEYS.ACTIVE)).toBe('p2')

    const migrated = decodeStoredProfile(storage.getItem(profileKey('default')))
    expect(migrated!.semesters[0]!.courses[0]!.name).toBe('Algorithms 1')
  })

  it('leaves legacy keys untouched (rollback safety)', () => {
    const storage = createMemoryStorage()
    seedLegacy(storage)
    migrateLegacyStorage(storage)
    expect(storage.getItem(LEGACY_KEYS.PROFILES)).not.toBeNull()
    expect(storage.getItem(legacyProfileKey('default'))).not.toBeNull()
  })

  it('is idempotent — second run is a no-op', () => {
    const storage = createMemoryStorage()
    seedLegacy(storage)
    migrateLegacyStorage(storage)
    const report = migrateLegacyStorage(storage)
    expect(report.alreadyDone).toBe(true)
    expect(report.migrated).toEqual([])
  })

  it('does not overwrite existing v3 data on a re-run without marker', () => {
    const storage = createMemoryStorage()
    seedLegacy(storage)
    migrateLegacyStorage(storage)
    // simulate marker loss but keep v3 data
    storage.removeItem(STORAGE_KEYS.MIGRATED)
    const before = storage.getItem(profileKey('default'))
    migrateLegacyStorage(storage)
    expect(storage.getItem(profileKey('default'))).toBe(before)
  })

  it('skips corrupted profiles but migrates the rest', () => {
    const storage = createMemoryStorage()
    seedLegacy(storage)
    storage.setItem(legacyProfileKey('p2'), '{corrupt json')

    const report = migrateLegacyStorage(storage)
    expect(report.migrated).toEqual(['default'])
    expect(report.skipped).toHaveLength(1)
    expect(report.skipped[0]!.id).toBe('p2')
  })

  it('handles a fresh install with no legacy data', () => {
    const storage = createMemoryStorage()
    const report = migrateLegacyStorage(storage)
    expect(report.alreadyDone).toBe(false)
    expect(report.migrated).toEqual([])
    expect(storage.getItem(STORAGE_KEYS.MIGRATED)).not.toBeNull()
  })

  it('falls back to the first profile when the legacy active id is unknown', () => {
    const storage = createMemoryStorage()
    seedLegacy(storage)
    storage.setItem(LEGACY_KEYS.ACTIVE, 'ghost')
    migrateLegacyStorage(storage)
    expect(storage.getItem(STORAGE_KEYS.ACTIVE)).toBe('default')
  })
})
