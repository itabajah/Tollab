/**
 * localStorage key constants for data persistence.
 */

/** localStorage key names and prefixes used by the application. */
export const STORAGE_KEYS = Object.freeze({
  /** Key for the profiles list JSON. */
  PROFILES: 'tollab_profiles',
  /** Key for the active profile ID. */
  ACTIVE_PROFILE: 'tollab_active',
  /** Prefix for per-profile data keys (appended with profile ID). */
  DATA_PREFIX: 'tollab_data_',
  /** Key for application settings. */
  SETTINGS: 'tollab_settings',
} as const);
