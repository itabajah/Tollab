import type { AppData } from '@/domain/model'

/**
 * The framework-free cloud-merge core. Mirrors the legacy single-node-per-user
 * model: one payload holds every profile, and login-time reconciliation is a
 * pure last-write-wins union of the local and cloud payloads.
 */

export interface CloudProfile {
  id: string
  name: string
  lastModified: string | null
  data: AppData | null
}

export interface CloudPayload {
  activeProfileId: string | null
  profiles: CloudProfile[]
}

/**
 * Orders two ISO timestamps the way the legacy sync did: a present value beats a
 * missing one, two missing/unparseable values compare equal, otherwise it is a
 * plain chronological comparison. Returns <0 when `a` is older, >0 when newer,
 * 0 when equal or indeterminate.
 */
export function compareIso(a: string | null, b: string | null): number {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  const at = Date.parse(a)
  const bt = Date.parse(b)
  if (Number.isNaN(at) && Number.isNaN(bt)) return 0
  if (Number.isNaN(at)) return -1
  if (Number.isNaN(bt)) return 1
  return at - bt
}

/**
 * A profile with no real data — null blob or zero semesters. These are skipped
 * during merge so a freshly-created empty default profile can never clobber real
 * data already living in the cloud.
 */
export function isEmptyProfile(p: CloudProfile): boolean {
  if (!p.data) return true
  return p.data.semesters.length === 0
}

function cleanName(name: string): string {
  return name.trim() || 'Profile'
}

/** First name in the `Base`, `Base (2)`, `Base (3)`… sequence not already taken. */
function makeNameUnique(desired: string, taken: Set<string>): string {
  const base = cleanName(desired)
  if (!taken.has(base)) return base
  let counter = 2
  let next = `${base} (${counter})`
  while (taken.has(next)) {
    counter += 1
    next = `${base} (${counter})`
  }
  return next
}

/**
 * Unions two payloads by profile id. For a profile present on both sides the
 * newer `lastModified` wins (ties and unparseable timestamps favour local).
 * Empty profiles are dropped, colliding names are de-duped with numeric
 * suffixes, and the active profile resolves to local → cloud → first survivor.
 * Pure: inputs are never mutated.
 *
 * `_now` is accepted for signature parity with the record builders; the merged
 * payload carries no top-level timestamp of its own.
 */
export function mergePayloads(local: CloudPayload, cloud: CloudPayload, _now: Date): CloudPayload {
  const taken = new Set<string>()
  const byId = new Map<string, CloudProfile>()

  for (const lp of local.profiles) {
    if (!lp.id || isEmptyProfile(lp)) continue
    const name = cleanName(lp.name)
    taken.add(name)
    byId.set(lp.id, { ...lp, name })
  }

  for (const raw of cloud.profiles) {
    if (!raw.id || isEmptyProfile(raw)) continue
    const cp: CloudProfile = { ...raw, name: cleanName(raw.name) }
    const existing = byId.get(cp.id)

    if (existing) {
      const localWins = compareIso(existing.lastModified, cp.lastModified) >= 0
      const chosen = localWins ? existing : cp
      let finalName = cleanName(chosen.name)
      if (finalName !== existing.name && taken.has(finalName)) {
        finalName = makeNameUnique(finalName, taken)
      }
      byId.set(cp.id, { ...chosen, name: finalName })
      taken.add(finalName)
      continue
    }

    const uniqueName = makeNameUnique(cp.name, taken)
    taken.add(uniqueName)
    byId.set(cp.id, { ...cp, name: uniqueName })
  }

  const profiles = Array.from(byId.values())

  let activeProfileId = local.activeProfileId
  if (!activeProfileId || !byId.has(activeProfileId)) activeProfileId = cloud.activeProfileId
  if (!activeProfileId || !byId.has(activeProfileId)) activeProfileId = profiles[0]?.id ?? null

  return { activeProfileId, profiles }
}
