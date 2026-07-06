import { buildExportFile, parseImportFile, exportFileName, ImportError } from './exportImport'
import { createEmptyAppData, appDataSchema } from '@/domain/model'

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

describe('parseImportFile — rejects non-v3 input', () => {
  it('throws ImportError for unrecognizable and legacy input', () => {
    expect(() => parseImportFile('nonsense')).toThrow(ImportError)
    expect(() => parseImportFile({ foo: 'bar' })).toThrow(ImportError)
    expect(() => parseImportFile(null)).toThrow(ImportError)
    // Legacy shapes are no longer accepted.
    expect(() => parseImportFile({ meta: { version: 1 }, data: { semesters: [] } })).toThrow(
      ImportError,
    )
    expect(() => parseImportFile({ semesters: [{ id: 's', name: 'Spring 2025' }] })).toThrow(
      ImportError,
    )
    expect(() => parseImportFile({ v: 2, d: [] })).toThrow(ImportError)
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
