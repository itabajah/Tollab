/** localStorage keys for the v3 storage format. */
export const STORAGE_KEYS = {
  PROFILES: 'tollab:v3:profiles',
  ACTIVE: 'tollab:v3:active',
  CLIENT: 'tollab:v3:client',
} as const

export function profileKey(profileId: string): string {
  return `tollab:v3:profile:${profileId}`
}
