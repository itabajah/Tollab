import { buildExportFile, parseImportFile, exportFileName, ImportError } from './exportImport'
import { createEmptyAppData, appDataSchema } from '@/domain/model'
import v2Full from './__fixtures__/v2-compact-full.json'

const NOW = '2026-07-04T10:00:00.000Z'

describe('buildExportFile / parseImportFile round-trip', () => {
  it('round-trips a v3 export', () => {
    const data = appDataSchema.parse({
      semesters: [{ id: 's1', name: 'Spring 2026' }],
      settings: {},
      lastModified: NOW,
    })
    const file = buildExportFile('My Profile', data, NOW)
    expect(file.format).toBe('tollab')
    expect(file.version).toBe(3)
    expect(file.exportedAt).toBe(NOW)

    const parsed = parseImportFile(JSON.parse(JSON.stringify(file)))
    expect(parsed.profileName).toBe('My Profile')
    expect(parsed.data).toEqual(data)
  })
})

describe('parseImportFile — legacy formats', () => {
  it('accepts the old v1 export wrapper {meta, data}', () => {
    const legacyExport = {
      meta: { version: 1, profileName: 'Old Profile', exportDate: '2025-01-01T00:00:00.000Z' },
      data: {
        semesters: [
          {
            id: 's_old',
            name: 'Winter 2024-2025',
            courses: [{ id: 'c1', name: 'Physics 1m', homework: [{ title: 'HW1' }] }],
          },
        ],
        settings: { theme: 'dark' },
        lastModified: '2025-01-01T00:00:00.000Z',
      },
    }
    const parsed = parseImportFile(legacyExport)
    expect(parsed.profileName).toBe('Old Profile')
    expect(parsed.data.semesters[0]!.courses[0]!.name).toBe('Physics 1m')
    expect(parsed.data.settings.theme).toBe('dark')
  })

  it('accepts a raw legacy appData shape {semesters, ...}', () => {
    const parsed = parseImportFile({ semesters: [{ id: 's', name: 'Spring 2025' }] })
    expect(parsed.profileName).toBeNull()
    expect(parsed.data.semesters[0]!.name).toBe('Spring 2025')
  })

  it('accepts a compact v2 blob (defensive)', () => {
    const parsed = parseImportFile(v2Full)
    expect(parsed.data.semesters[0]!.courses[0]!.name).toBe('Algorithms 1')
  })

  it('throws ImportError for unrecognizable input', () => {
    expect(() => parseImportFile('nonsense')).toThrow(ImportError)
    expect(() => parseImportFile({ foo: 'bar' })).toThrow(ImportError)
    expect(() => parseImportFile(null)).toThrow(ImportError)
  })
})

describe('exportFileName', () => {
  it('builds a safe dated filename', () => {
    expect(exportFileName('My Profile!', new Date('2026-07-04T12:00:00'))).toBe(
      'tollab-My_Profile_-2026-07-04.json',
    )
  })

  it('falls back for empty names', () => {
    expect(exportFileName('', new Date('2026-07-04T12:00:00'))).toBe(
      'tollab-export-2026-07-04.json',
    )
  })
})

describe('parseImportFile — validation', () => {
  it('rejects an export with a corrupt data section', () => {
    expect(() =>
      parseImportFile({
        format: 'tollab',
        version: 3,
        profile: { name: 'x' },
        data: { semesters: 'no' },
      }),
    ).toThrow(ImportError)
  })

  it('parses an empty export', () => {
    const file = buildExportFile('Empty', createEmptyAppData(NOW), NOW)
    expect(parseImportFile(JSON.parse(JSON.stringify(file))).data.semesters).toEqual([])
  })
})
