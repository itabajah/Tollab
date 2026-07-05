import { z } from 'zod'
import { appDataSchema } from '@/domain/model'
import type { CloudPayload } from '@/domain/merge'
import { decodeLegacyProfile } from '@/services/storage/migrate'

/**
 * The cloud record wire format. v3 is the canonical shape; the reader also
 * understands the legacy v1/v2 records so existing cloud data loads. The
 * writer and reader share `cloudRecordSchema`, which structurally prevents the
 * legacy echo-suppression bug (writer wrote `w`/`c`, reader read
 * `writeId`/`originClientId`).
 */

export const cloudProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastModified: z.string().nullable(),
  data: appDataSchema.nullable(),
})

export const cloudPayloadSchema = z.object({
  activeProfileId: z.string().nullable(),
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

type Dict = Record<string, unknown>
const isDict = (x: unknown): x is Dict => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Decodes the v2 compact payload shape `{a, p:[{i,n,t,d}]}`. */
function normalizeV2Payload(raw: Dict): CloudPayload {
  const profiles = Array.isArray(raw.p) ? raw.p : []
  return {
    activeProfileId: typeof raw.a === 'string' ? raw.a : null,
    profiles: profiles.filter(isDict).map((p) => ({
      id: typeof p.i === 'string' ? p.i : '',
      name: typeof p.n === 'string' ? p.n : 'Profile',
      lastModified: typeof p.t === 'string' ? p.t : null,
      data: decodeLegacyProfile(p.d),
    })),
  }
}

/** Decodes the v1 payload shape `{profiles:[{id,name,export:{data}}]}`. */
function normalizeV1Payload(raw: Dict): CloudPayload {
  const profiles = Array.isArray(raw.profiles) ? raw.profiles : []
  return {
    activeProfileId: typeof raw.active === 'string' ? raw.active : null,
    profiles: profiles.filter(isDict).map((p) => {
      const exportBlob = isDict(p.export) ? p.export : {}
      return {
        id: typeof p.id === 'string' ? p.id : '',
        name: typeof p.name === 'string' ? p.name : 'Profile',
        lastModified: typeof p.updatedAt === 'string' ? p.updatedAt : null,
        data: decodeLegacyProfile(exportBlob.data ?? p.data),
      }
    }),
  }
}

/**
 * Parses any cloud record (v3 canonical, or legacy v1/v2) into a normalized
 * payload plus its echo-suppression fields. Returns null for junk.
 */
export function normalizeCloudRecord(raw: unknown): NormalizedRecord | null {
  if (!isDict(raw)) return null

  const v3 = cloudRecordSchema.safeParse(raw)
  if (v3.success) {
    return { payload: v3.data.payload, clientId: v3.data.clientId, writeId: v3.data.writeId }
  }

  if (raw.v === 2 && isDict(raw.payload)) {
    return {
      payload: normalizeV2Payload(raw.payload),
      clientId: typeof raw.c === 'string' ? raw.c : null,
      writeId: typeof raw.w === 'string' ? raw.w : null,
    }
  }

  if ((raw.version === 1 || raw.v === 1) && Array.isArray(raw.profiles)) {
    return { payload: normalizeV1Payload(raw), clientId: null, writeId: null }
  }

  return null
}
