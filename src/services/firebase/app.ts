import { initializeApp, type FirebaseApp } from 'firebase/app'
import { firebaseConfigFromEnv, type FirebaseConfig } from './config'

let cachedApp: FirebaseApp | null = null

/**
 * Lazily initializes the Firebase app from build-time env config.
 * Returns null when no config is present (offline/dev/E2E).
 */
export function getFirebaseApp(
  config: FirebaseConfig | null = firebaseConfigFromEnv(),
): FirebaseApp | null {
  if (config === null) return null
  if (cachedApp === null) {
    // Drop undefined optional keys — Firebase's options reject them under
    // exactOptionalPropertyTypes.
    const options = Object.fromEntries(
      Object.entries(config).filter(([, value]) => value !== undefined),
    )
    cachedApp = initializeApp(options)
  }
  return cachedApp
}
