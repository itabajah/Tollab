/**
 * Tests for firebase-config — config loading from env vars,
 * graceful handling of missing variables.
 *
 * Since firebase-config.ts runs at module load time with side effects,
 * we test by re-importing with different env configurations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInitializeApp = vi.fn((_config?: any) => ({ name: '[DEFAULT]' }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetAuth = vi.fn((_app?: any) => ({ currentUser: null }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetDatabase = vi.fn((_app?: any) => ({ app: { name: '[DEFAULT]' } }));

vi.mock('firebase/app', () => ({
  initializeApp: (config: unknown) => mockInitializeApp(config),
}));

vi.mock('firebase/auth', () => ({
  getAuth: (app: unknown) => mockGetAuth(app),
}));

vi.mock('firebase/database', () => ({
  getDatabase: (app: unknown) => mockGetDatabase(app),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('firebase-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('when all env vars are present', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
      vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://test.firebaseio.com');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
      vi.stubEnv('VITE_FIREBASE_APP_ID', '1:test:web:app');
    });

    it('exports isFirebaseConfigured as true', async () => {
      const mod = await import('@/services/firebase-config');
      expect(mod.isFirebaseConfigured).toBe(true);
    });

    it('calls initializeApp with config', async () => {
      await import('@/services/firebase-config');
      expect(mockInitializeApp).toHaveBeenCalledTimes(1);
      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test-api-key',
          authDomain: 'test.firebaseapp.com',
          databaseURL: 'https://test.firebaseio.com',
          projectId: 'test-project',
          appId: '1:test:web:app',
        }),
      );
    });

    it('exports non-null app, auth, database', async () => {
      const mod = await import('@/services/firebase-config');
      expect(mod.app).not.toBeNull();
      expect(mod.auth).not.toBeNull();
      expect(mod.database).not.toBeNull();
    });

    it('includes optional storageBucket when provided', async () => {
      vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test.appspot.com');
      await import('@/services/firebase-config');
      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          storageBucket: 'test.appspot.com',
        }),
      );
    });

    it('includes optional messagingSenderId when provided', async () => {
      vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456');
      await import('@/services/firebase-config');
      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          messagingSenderId: '123456',
        }),
      );
    });
  });

  describe('when required env vars are missing', () => {
    beforeEach(() => {
      // Clear all Firebase env vars
      vi.stubEnv('VITE_FIREBASE_API_KEY', '');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', '');
      vi.stubEnv('VITE_FIREBASE_DATABASE_URL', '');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');
      vi.stubEnv('VITE_FIREBASE_APP_ID', '');
    });

    it('exports isFirebaseConfigured as false', async () => {
      const mod = await import('@/services/firebase-config');
      expect(mod.isFirebaseConfigured).toBe(false);
    });

    it('does not call initializeApp', async () => {
      await import('@/services/firebase-config');
      expect(mockInitializeApp).not.toHaveBeenCalled();
    });

    it('exports null for app, auth, database', async () => {
      const mod = await import('@/services/firebase-config');
      expect(mod.app).toBeNull();
      expect(mod.auth).toBeNull();
      expect(mod.database).toBeNull();
    });
  });

  describe('when only some env vars are present', () => {
    it('returns false if apiKey is missing', async () => {
      vi.stubEnv('VITE_FIREBASE_API_KEY', '');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
      vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://test.firebaseio.com');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
      vi.stubEnv('VITE_FIREBASE_APP_ID', '1:test:web:app');

      const mod = await import('@/services/firebase-config');
      expect(mod.isFirebaseConfigured).toBe(false);
    });

    it('returns false if projectId is missing', async () => {
      vi.stubEnv('VITE_FIREBASE_API_KEY', 'key');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
      vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://test.firebaseio.com');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');
      vi.stubEnv('VITE_FIREBASE_APP_ID', '1:test:web:app');

      const mod = await import('@/services/firebase-config');
      expect(mod.isFirebaseConfigured).toBe(false);
    });

    it('returns false if databaseURL is missing', async () => {
      vi.stubEnv('VITE_FIREBASE_API_KEY', 'key');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
      vi.stubEnv('VITE_FIREBASE_DATABASE_URL', '');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'project');
      vi.stubEnv('VITE_FIREBASE_APP_ID', '1:test:web:app');

      const mod = await import('@/services/firebase-config');
      expect(mod.isFirebaseConfigured).toBe(false);
    });
  });

  describe('when initializeApp throws', () => {
    it('exports isFirebaseConfigured as false', async () => {
      vi.stubEnv('VITE_FIREBASE_API_KEY', 'key');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
      vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://test.firebaseio.com');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'project');
      vi.stubEnv('VITE_FIREBASE_APP_ID', 'app');
      mockInitializeApp.mockImplementationOnce(() => {
        throw new Error('Firebase init error');
      });

      const mod = await import('@/services/firebase-config');
      expect(mod.isFirebaseConfigured).toBe(false);
    });
  });
});
