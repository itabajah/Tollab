import { z } from 'zod'

/**
 * Firebase config is injected at build time from VITE_FIREBASE_* env vars
 * (deploy workflow reads GitHub Secrets). When absent — local dev, E2E,
 * previews — the app runs fully offline and the sync UI shows "unavailable".
 */
const firebaseConfigSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  databaseURL: z.string().min(1),
  projectId: z.string().min(1),
  storageBucket: z.string().optional(),
  messagingSenderId: z.string().optional(),
  appId: z.string().optional(),
  measurementId: z.string().optional(),
})

export type FirebaseConfig = z.infer<typeof firebaseConfigSchema>

type EnvLike = Record<string, string | undefined>

/** Returns a validated Firebase config, or null when the required vars are unset. */
export function firebaseConfigFromEnv(
  env: EnvLike = import.meta.env as EnvLike,
): FirebaseConfig | null {
  const candidate = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  }
  const result = firebaseConfigSchema.safeParse(candidate)
  return result.success ? result.data : null
}
