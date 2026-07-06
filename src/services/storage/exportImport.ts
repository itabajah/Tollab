import { z } from 'zod'
import { appDataSchema, type AppData } from '@/domain/model'

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

const exportFileSchemaV3 = z.object({
  format: z.literal('tollab'),
  version: z.literal(3),
  exportedAt: z.string().optional(),
  profile: z.object({ name: z.string() }).optional(),
  data: appDataSchema,
})

export interface ExportFileV3 {
  format: 'tollab'
  version: 3
  exportedAt: string
  profile: { name: string }
  data: AppData
}

export function buildExportFile(
  profileName: string,
  data: AppData,
  exportedAt: string,
): ExportFileV3 {
  return { format: 'tollab', version: 3, exportedAt, profile: { name: profileName }, data }
}

export interface ParsedImport {
  profileName: string | null
  data: AppData
}

/** Accepts only v3 export files (`{format:'tollab', version:3, ...}`). */
export function parseImportFile(raw: unknown): ParsedImport {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ImportError('Not a Tollab export file')
  }
  const obj = raw as Record<string, unknown>

  if (obj.format !== 'tollab') throw new ImportError('Not a Tollab export file')

  const result = exportFileSchemaV3.safeParse(obj)
  if (!result.success) throw new ImportError('Corrupt Tollab v3 export file')
  return { profileName: result.data.profile?.name ?? null, data: result.data.data }
}

/** `tollab-<safe name>-<YYYY-MM-DD>.json`, matching the legacy convention. */
export function exportFileName(profileName: string, now: Date): string {
  const safe = profileName.replace(/[^A-Za-z0-9-]/g, '_').slice(0, 100)
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `tollab-${safe || 'export'}-${yyyy}-${mm}-${dd}.json`
}
