/** localStorage keys for the v3 storage format. */
export const STORAGE_KEYS = {
  PROFILES: 'tollab:v3:profiles',
  ACTIVE: 'tollab:v3:active',
  CLIENT: 'tollab:v3:client',
  MIGRATED: 'tollab:v3:migrated',
} as const

export function profileKey(profileId: string): string {
  return `tollab:v3:profile:${profileId}`
}

/** Keys used by the legacy (pre-rebuild) app; read-only for migration. */
export const LEGACY_KEYS = {
  PROFILES: 'tollab_profiles',
  ACTIVE: 'tollab_active',
} as const

export function legacyProfileKey(profileId: string): string {
  return `tollab_${profileId}`
}
