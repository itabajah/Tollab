/**
 * Tests for firebase-auth.ts — Firebase Authentication service.
 *
 * All Firebase SDK functions are mocked. Tests cover both configured
 * and unconfigured (auth === null) code paths.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test
// ---------------------------------------------------------------------------

const {
  mockOnAuthStateChanged,
  mockSignInWithPopup,
  mockFirebaseSignOut,
  mockGoogleAuthProvider,
} = vi.hoisted(() => ({
  mockOnAuthStateChanged: vi.fn(),
  mockSignInWithPopup: vi.fn(),
  mockFirebaseSignOut: vi.fn(),
  mockGoogleAuthProvider: vi.fn(() => ({
    setCustomParameters: vi.fn(),
  })),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signOut: (...args: unknown[]) => mockFirebaseSignOut(...args),
  GoogleAuthProvider: mockGoogleAuthProvider,
}));

// We'll control the `auth` value per-test via a mutable ref
let mockAuth: unknown = null;
vi.mock('@/services/firebase-config', () => ({
  get auth() {
    return mockAuth;
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  initAuth,
  signInWithGoogle,
  signOut,
  onAuthStateChange,
  getCurrentUser,
} from '@/services/firebase-auth';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const fakeUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
} as unknown;

function makeFakeAuth(currentUser: unknown = null) {
  return { currentUser };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('firebase-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = null;
  });

  // =========================================================================
  // initAuth
  // =========================================================================

  describe('initAuth', () => {
    it('returns null and calls callback(null) when auth is not configured', () => {
      const callback = vi.fn();
      const result = initAuth(callback);
      expect(result).toBeNull();
      expect(callback).toHaveBeenCalledWith(null);
    });

    it('calls onAuthStateChanged and returns unsubscribe when auth is configured', () => {
      mockAuth = makeFakeAuth();
      const unsubscribe = vi.fn();
      mockOnAuthStateChanged.mockReturnValue(unsubscribe);
      const callback = vi.fn();

      const result = initAuth(callback);

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(mockAuth, callback);
      expect(result).toBe(unsubscribe);
    });

    it('passes through the callback to onAuthStateChanged', () => {
      mockAuth = makeFakeAuth();
      mockOnAuthStateChanged.mockReturnValue(vi.fn());
      const callback = vi.fn();

      initAuth(callback);

      expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
      const passedCallback = (mockOnAuthStateChanged as Mock).mock.calls[0]![1];
      expect(passedCallback).toBe(callback);
    });
  });

  // =========================================================================
  // signInWithGoogle
  // =========================================================================

  describe('signInWithGoogle', () => {
    it('returns null when auth is not configured', async () => {
      const result = await signInWithGoogle();
      expect(result).toBeNull();
      expect(mockSignInWithPopup).not.toHaveBeenCalled();
    });

    it('returns user on successful sign-in', async () => {
      mockAuth = makeFakeAuth();
      mockSignInWithPopup.mockResolvedValue({ user: fakeUser });

      const result = await signInWithGoogle();

      expect(result).toBe(fakeUser);
      expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    });

    it('creates a GoogleAuthProvider with select_account prompt', async () => {
      mockAuth = makeFakeAuth();
      mockSignInWithPopup.mockResolvedValue({ user: fakeUser });

      await signInWithGoogle();

      expect(mockGoogleAuthProvider).toHaveBeenCalled();
      const providerInstance = mockGoogleAuthProvider.mock.results[0]!.value;
      expect(providerInstance.setCustomParameters).toHaveBeenCalledWith({
        prompt: 'select_account',
      });
    });

    it('propagates errors from signInWithPopup', async () => {
      mockAuth = makeFakeAuth();
      mockSignInWithPopup.mockRejectedValue(new Error('Popup closed'));

      await expect(signInWithGoogle()).rejects.toThrow('Popup closed');
    });
  });

  // =========================================================================
  // signOut
  // =========================================================================

  describe('signOut', () => {
    it('does nothing when auth is not configured', async () => {
      await signOut();
      expect(mockFirebaseSignOut).not.toHaveBeenCalled();
    });

    it('calls firebaseSignOut when auth is configured', async () => {
      mockAuth = makeFakeAuth();
      mockFirebaseSignOut.mockResolvedValue(undefined);

      await signOut();

      expect(mockFirebaseSignOut).toHaveBeenCalledWith(mockAuth);
    });

    it('propagates errors from firebaseSignOut', async () => {
      mockAuth = makeFakeAuth();
      mockFirebaseSignOut.mockRejectedValue(new Error('Network error'));

      await expect(signOut()).rejects.toThrow('Network error');
    });
  });

  // =========================================================================
  // onAuthStateChange
  // =========================================================================

  describe('onAuthStateChange', () => {
    it('returns null when auth is not configured', () => {
      const callback = vi.fn();
      const result = onAuthStateChange(callback);
      expect(result).toBeNull();
      expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
    });

    it('returns unsubscribe function when auth is configured', () => {
      mockAuth = makeFakeAuth();
      const unsubscribe = vi.fn();
      mockOnAuthStateChanged.mockReturnValue(unsubscribe);
      const callback = vi.fn();

      const result = onAuthStateChange(callback);

      expect(result).toBe(unsubscribe);
      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(mockAuth, callback);
    });
  });

  // =========================================================================
  // getCurrentUser
  // =========================================================================

  describe('getCurrentUser', () => {
    it('returns null when auth is not configured', () => {
      const result = getCurrentUser();
      expect(result).toBeNull();
    });

    it('returns null when no user is signed in', () => {
      mockAuth = makeFakeAuth(null);
      const result = getCurrentUser();
      expect(result).toBeNull();
    });

    it('returns the current user when signed in', () => {
      mockAuth = makeFakeAuth(fakeUser);
      const result = getCurrentUser();
      expect(result).toBe(fakeUser);
    });
  });
});
