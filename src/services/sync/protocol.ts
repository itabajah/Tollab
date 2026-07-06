import { z } from 'zod'
import { appDataSchema } from '@/domain/model'
import type { CloudPayload } from '@/domain/merge'

/**
 * The cloud record wire format. There is a single canonical shape (v3); the
 * writer and reader share `cloudRecordSchema`, which structurally prevents the
 * legacy echo-suppression bug (writer wrote `w`/`c`, reader read
 * `writeId`/`originClientId`).
 */

// Firebase RTDB stores `null` by omitting the key, so on read-back the key is
// absent. `.nullish()` tolerates both an absent key and an explicit null (plain
// `.nullable()` rejects an absent key); the transform normalizes back to null so
// the payload types stay `T | null`. Without this, one null field would make the
// entire cloud record fail to parse and be silently ignored by every client.
const nullableString = z
  .string()
  .nullish()
  .transform((v) => v ?? null)

export const cloudProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastModified: nullableString,
  data: appDataSchema.nullish().transform((v) => v ?? null),
})

export const cloudPayloadSchema = z.object({
  activeProfileId: nullableString,
  profiles: z.array(cloudProfileSchema),
})

export const cloudRecordSchema = z.object({
  v: z.literal(3),
  updatedAt: z.string(),
  clientId: z.string(),
  writeId: z.string(),
  payload: cloudPayloadSchema,
})

export type CloudRecordV3 = z.infer<typeof cloudRecordSchema>

export function buildCloudRecord(
  payload: CloudPayload,
  clientId: string,
  writeId: string,
  now: Date,
): CloudRecordV3 {
  return { v: 3, updatedAt: now.toISOString(), clientId, writeId, payload }
}

export interface NormalizedRecord {
  payload: CloudPayload
  clientId: string | null
  writeId: string | null
}

/**
 * Parses a cloud record into a normalized payload plus its echo-suppression
 * fields. Returns null for anything that isn't a valid v3 record.
 */
export function normalizeCloudRecord(raw: unknown): NormalizedRecord | null {
  const result = cloudRecordSchema.safeParse(raw)
  if (!result.success) return null
  return {
    payload: result.data.payload,
    clientId: result.data.clientId,
    writeId: result.data.writeId,
  }
}
