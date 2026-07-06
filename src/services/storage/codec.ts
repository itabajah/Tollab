import { z } from 'zod'
import { appDataSchema, type AppData } from '@/domain/model'

/**
 * v3 stored-profile envelope. Unlike the legacy compact codec, v3 stores the
 * full JSON shape — one canonical representation everywhere (store, disk,
 * cloud, export); Zod parse-on-read validates and fills defaults.
 */
const storedProfileSchema = z.object({
  v: z.literal(3),
  savedAt: z.string(),
  data: appDataSchema,
})

export function encodeStoredProfile(data: AppData, savedAt: string): string {
  return JSON.stringify({ v: 3, savedAt, data })
}

export function decodeStoredProfile(json: string | null): AppData | null {
  if (json === null) return null
  try {
    const result = storedProfileSchema.safeParse(JSON.parse(json))
    return result.success ? result.data.data : null
  } catch {
    return null
  }
}
