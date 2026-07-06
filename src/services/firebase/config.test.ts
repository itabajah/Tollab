import { firebaseConfigFromEnv } from './config'

describe('firebaseConfigFromEnv', () => {
  it('returns a config when the required vars are present', () => {
    const config = firebaseConfigFromEnv({
      VITE_FIREBASE_API_KEY: 'key',
      VITE_FIREBASE_AUTH_DOMAIN: 'app.firebaseapp.com',
      VITE_FIREBASE_DATABASE_URL: 'https://app.firebaseio.com',
      VITE_FIREBASE_PROJECT_ID: 'app',
    })
    expect(config).not.toBeNull()
    expect(config!.apiKey).toBe('key')
  })

  it('returns null when required vars are missing', () => {
    expect(firebaseConfigFromEnv({})).toBeNull()
    expect(firebaseConfigFromEnv({ VITE_FIREBASE_API_KEY: 'key' })).toBeNull()
  })
})
