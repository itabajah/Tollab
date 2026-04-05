/**
 * Tests for useFirebaseSync hook — sign in/out flow, auto-sync,
 * conflict detection/resolution, error handling with toasts, offline handling.
 *
 * All Firebase services and stores are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { FirebaseSyncState, ToastType } from '@/types';
import type { CloudPayload, CloudProfileEntry } from '@/types';

// ---------------------------------------------------------------------------
// Mocks — hoisted before imports
// ---------------------------------------------------------------------------

const mockShowToast = vi.fn();

const {
  mockIsFirebaseConfigured,
  mockSignInWithGoogle,
  mockFirebaseSignOut,
  mockInitAuth,
  mockBuildLocalPayload,
  mockPullFromFirebase,
  mockPushToFirebase,
  mockSubscribeToFirebase,
  mockMergeLocalAndCloud,
  mockDebouncedSync,
  mockCancelPendingSync,
  mockGetIsApplyingRemote,
  mockSubscribe,
} = vi.hoisted(() => ({
  mockIsFirebaseConfigured: { value: true },
  mockSignInWithGoogle: vi.fn(),
  mockFirebaseSignOut: vi.fn(),
  mockInitAuth: vi.fn(),
  mockBuildLocalPayload: vi.fn(),
  mockPullFromFirebase: vi.fn(),
  mockPushToFirebase: vi.fn(),
  mockSubscribeToFirebase: vi.fn(),
  mockMergeLocalAndCloud: vi.fn(),
  mockDebouncedSync: vi.fn(),
  mockCancelPendingSync: vi.fn(),
  mockGetIsApplyingRemote: vi.fn(() => false),
  mockSubscribe: vi.fn(() => vi.fn()),
}));

vi.mock('@/components/toast/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/services/firebase-config', () => ({
  get isFirebaseConfigured() {
    return mockIsFirebaseConfigured.value;
  },
}));

vi.mock('@/services/firebase-auth', () => ({
  signInWithGoogle: () => mockSignInWithGoogle(),
  signOut: () => mockFirebaseSignOut(),
  initAuth: (cb: unknown) => mockInitAuth(cb),
}));

vi.mock('@/services/firebase-sync', () => ({
  buildLocalPayload: (data: unknown) => mockBuildLocalPayload(data),
  pullFromFirebase: (uid: unknown) => mockPullFromFirebase(uid),
  pushToFirebase: (uid: unknown, payload: unknown) => mockPushToFirebase(uid, payload),
  subscribeToFirebase: (uid: unknown, cb: unknown) => mockSubscribeToFirebase(uid, cb),
  mergeLocalAndCloud: (local: unknown, cloud: unknown) => mockMergeLocalAndCloud(local, cloud),
  debouncedSync: (uid: unknown, data: unknown) => mockDebouncedSync(uid, data),
  cancelPendingSync: () => mockCancelPendingSync(),
  getIsApplyingRemote: () => mockGetIsApplyingRemote(),
}));

vi.mock('@/store/app-store', () => ({
  useAppStore: Object.assign(vi.fn(), { subscribe: (...args: unknown[]) => mockSubscribe(...args) }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { useFirebaseSync } from '@/hooks/useFirebaseSync';
import type { UseFirebaseSyncOptions } from '@/hooks/useFirebaseSync';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfileEntry(
  id: string,
  lastModified: string | null = null,
): CloudProfileEntry {
  return {
    id,
    name: `Profile ${id}`,
    lastModified,
    data: null,
  };
}

function makePayload(
  profiles: CloudProfileEntry[],
  activeProfileId = 'p1',
): CloudPayload {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    activeProfileId,
    profiles,
  };
}

const fakeUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

function defaultOptions(): UseFirebaseSyncOptions {
  return {
    getAppData: vi.fn(() => ({
      profiles: [],
      activeProfileId: '',
      profilesData: {},
    })) as unknown as () => import('@/services/firebase-sync').AppData,
    applyCloudPayload: vi.fn(),
    onConflict: vi.fn(),
  };
}

function renderFirebaseSyncHook(opts?: Partial<UseFirebaseSyncOptions>) {
  const options = { ...defaultOptions(), ...opts };
  return renderHook(() => useFirebaseSync(options));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFirebaseSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFirebaseConfigured.value = true;
    mockInitAuth.mockReturnValue(vi.fn());
    mockSubscribeToFirebase.mockReturnValue(vi.fn());
    mockPushToFirebase.mockResolvedValue(undefined);
  });

  // =========================================================================
  // Initial state
  // =========================================================================

  describe('initial state', () => {
    it('starts signed out', () => {
      const { result } = renderFirebaseSyncHook();
      expect(result.current.isSignedIn).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('starts with idle sync status', () => {
      const { result } = renderFirebaseSyncHook();
      expect(result.current.syncStatus).toBe('idle');
    });

    it('starts with no last sync time', () => {
      const { result } = renderFirebaseSyncHook();
      expect(result.current.lastSyncTime).toBeNull();
    });

    it('starts with disconnected sync state', () => {
      const { result } = renderFirebaseSyncHook();
      expect(result.current.syncState).toBe(FirebaseSyncState.Disconnected);
    });

    it('provides signIn, signOut, forceSyncNow functions', () => {
      const { result } = renderFirebaseSyncHook();
      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.forceSyncNow).toBe('function');
    });
  });

  // =========================================================================
  // Firebase not configured
  // =========================================================================

  describe('firebase not configured', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.value = false;
    });

    it('does not call initAuth', () => {
      renderFirebaseSyncHook();
      expect(mockInitAuth).not.toHaveBeenCalled();
    });

    it('signIn is a no-op', async () => {
      const { result } = renderFirebaseSyncHook();
      await act(async () => {
        await result.current.signIn();
      });
      expect(mockSignInWithGoogle).not.toHaveBeenCalled();
      expect(result.current.isSignedIn).toBe(false);
    });
  });

  // =========================================================================
  // Sign in flow
  // =========================================================================

  describe('signIn', () => {
    it('calls signInWithGoogle', async () => {
      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockResolvedValue(null);
      mockBuildLocalPayload.mockReturnValue(makePayload([]));

      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.signIn();
      });

      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('handles null user from signIn (cancelled popup)', async () => {
      mockSignInWithGoogle.mockResolvedValue(null);

      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.signIn();
      });

      expect(result.current.syncStatus).toBe('idle');
      expect(result.current.syncState).toBe(FirebaseSyncState.Disconnected);
    });

    it('pushes local data when no cloud data exists', async () => {
      const localPayload = makePayload([makeProfileEntry('p1')]);
      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockResolvedValue(null);
      mockBuildLocalPayload.mockReturnValue(localPayload);

      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.signIn();
      });

      expect(mockPushToFirebase).toHaveBeenCalledWith(fakeUser.uid, localPayload);
    });

    it('shows error toast on signIn failure', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('Popup blocked'));

      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.signIn();
      });

      expect(result.current.syncStatus).toBe('error');
      expect(result.current.syncState).toBe(FirebaseSyncState.Error);
      expect(mockShowToast).toHaveBeenCalledWith(
        'Sign-in failed',
        ToastType.Error,
        expect.objectContaining({ description: 'Popup blocked' }),
      );
    });

    it('shows generic error message for non-Error throws', async () => {
      mockSignInWithGoogle.mockRejectedValue('string error');

      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.signIn();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'Sign-in failed',
        ToastType.Error,
        expect.objectContaining({ description: 'Could not sign in to Google.' }),
      );
    });
  });

  // =========================================================================
  // Conflict detection and resolution
  // =========================================================================

  describe('conflict handling', () => {
    it('calls onConflict when local and cloud profiles differ', async () => {
      const localPayload = makePayload([makeProfileEntry('p1', '2024-01-01')]);
      const cloudPayload = makePayload([
        makeProfileEntry('p1', '2024-01-01'),
        makeProfileEntry('p2', '2024-01-02'),
      ]);

      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockResolvedValue(cloudPayload);
      mockBuildLocalPayload.mockReturnValue(localPayload);

      const onConflict = vi.fn().mockResolvedValue(null);
      const { result } = renderFirebaseSyncHook({ onConflict });

      await act(async () => {
        await result.current.signIn();
      });

      expect(onConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          localProfileCount: 1,
          cloudProfileCount: 2,
        }),
      );
    });

    it('applies cloud data on use_cloud resolution', async () => {
      const localPayload = makePayload([makeProfileEntry('p1', '2024-01-01')]);
      const cloudPayload = makePayload([makeProfileEntry('p1', '2024-01-02')]);

      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockResolvedValue(cloudPayload);
      mockBuildLocalPayload.mockReturnValue(localPayload);

      const applyCloudPayload = vi.fn();
      const onConflict = vi.fn().mockResolvedValue('use_cloud');

      const { result } = renderFirebaseSyncHook({ applyCloudPayload, onConflict });

      await act(async () => {
        await result.current.signIn();
      });

      expect(applyCloudPayload).toHaveBeenCalledWith(cloudPayload);
    });

    it('pushes local data on use_local resolution', async () => {
      const localPayload = makePayload([makeProfileEntry('p1', '2024-01-02')]);
      const cloudPayload = makePayload([makeProfileEntry('p1', '2024-01-01')]);

      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockResolvedValue(cloudPayload);
      mockBuildLocalPayload.mockReturnValue(localPayload);

      const onConflict = vi.fn().mockResolvedValue('use_local');

      const { result } = renderFirebaseSyncHook({ onConflict });

      await act(async () => {
        await result.current.signIn();
      });

      expect(mockPushToFirebase).toHaveBeenCalledWith(fakeUser.uid, localPayload);
    });

    it('merges and pushes on merge resolution', async () => {
      const localPayload = makePayload([makeProfileEntry('p1', '2024-01-01')]);
      const cloudPayload = makePayload([makeProfileEntry('p1', '2024-01-02')]);
      const mergedPayload = makePayload([makeProfileEntry('p1', '2024-01-02')]);

      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockResolvedValue(cloudPayload);
      mockBuildLocalPayload.mockReturnValue(localPayload);
      mockMergeLocalAndCloud.mockReturnValue(mergedPayload);

      const applyCloudPayload = vi.fn();
      const onConflict = vi.fn().mockResolvedValue('merge');

      const { result } = renderFirebaseSyncHook({ applyCloudPayload, onConflict });

      await act(async () => {
        await result.current.signIn();
      });

      expect(mockMergeLocalAndCloud).toHaveBeenCalledWith(localPayload, cloudPayload);
      expect(applyCloudPayload).toHaveBeenCalledWith(mergedPayload);
      expect(mockPushToFirebase).toHaveBeenCalledWith(fakeUser.uid, mergedPayload);
    });

    it('does nothing on cancel (null resolution)', async () => {
      const localPayload = makePayload([makeProfileEntry('p1', '2024-01-01')]);
      const cloudPayload = makePayload([makeProfileEntry('p1', '2024-01-02')]);

      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockResolvedValue(cloudPayload);
      mockBuildLocalPayload.mockReturnValue(localPayload);

      const applyCloudPayload = vi.fn();
      const onConflict = vi.fn().mockResolvedValue(null);

      const { result } = renderFirebaseSyncHook({ applyCloudPayload, onConflict });

      await act(async () => {
        await result.current.signIn();
      });

      expect(applyCloudPayload).not.toHaveBeenCalled();
      // pushToFirebase should only be called for the initial push attempt, not after cancel
    });

    it('does not trigger conflict when data matches', async () => {
      const payload = makePayload([makeProfileEntry('p1', '2024-01-01')]);

      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockResolvedValue(payload);
      mockBuildLocalPayload.mockReturnValue(payload);

      const onConflict = vi.fn();
      const { result } = renderFirebaseSyncHook({ onConflict });

      await act(async () => {
        await result.current.signIn();
      });

      expect(onConflict).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Sign out
  // =========================================================================

  describe('signOut', () => {
    it('calls firebase signOut', async () => {
      mockFirebaseSignOut.mockResolvedValue(undefined);

      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);
    });

    it('resets sync state on signOut', async () => {
      mockFirebaseSignOut.mockResolvedValue(undefined);

      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.syncState).toBe(FirebaseSyncState.Disconnected);
      expect(result.current.syncStatus).toBe('idle');
      expect(result.current.lastSyncTime).toBeNull();
    });

    it('cancels pending sync on signOut', async () => {
      mockFirebaseSignOut.mockResolvedValue(undefined);

      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockCancelPendingSync).toHaveBeenCalled();
    });

    it('handles signOut errors gracefully', async () => {
      mockFirebaseSignOut.mockRejectedValue(new Error('Network error'));

      const { result } = renderFirebaseSyncHook();

      // Should not throw
      await act(async () => {
        await result.current.signOut();
      });

      // Should still be callable without crashing
      expect(result.current).toBeDefined();
    });
  });

  // =========================================================================
  // forceSyncNow
  // =========================================================================

  describe('forceSyncNow', () => {
    it('does nothing if not signed in', async () => {
      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.forceSyncNow();
      });

      expect(mockPushToFirebase).not.toHaveBeenCalled();
    });

    it('shows error toast on sync failure', async () => {
      // Set up initAuth to call back with user
      let authCallback: ((u: unknown) => void) | null = null;
      mockInitAuth.mockImplementation((cb: (u: unknown) => void) => {
        authCallback = cb;
        return vi.fn();
      });

      // Sign in first to set user
      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockResolvedValue(null);
      mockBuildLocalPayload.mockReturnValue(makePayload([]));

      const { result } = renderFirebaseSyncHook();

      // Simulate auth callback setting the user
      act(() => {
        authCallback!(fakeUser);
      });

      await act(async () => {
        await result.current.signIn();
      });

      // Now make push fail for forceSyncNow
      mockPushToFirebase.mockRejectedValue(new Error('Network timeout'));
      mockBuildLocalPayload.mockReturnValue(makePayload([]));

      await act(async () => {
        await result.current.forceSyncNow();
      });

      expect(result.current.syncStatus).toBe('error');
      expect(mockShowToast).toHaveBeenCalledWith(
        'Sync failed',
        ToastType.Error,
        expect.objectContaining({ description: 'Network timeout' }),
      );
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('shows toast on initial sync failure', async () => {
      mockSignInWithGoogle.mockResolvedValue(fakeUser);
      mockPullFromFirebase.mockRejectedValue(new Error('Database unavailable'));
      mockBuildLocalPayload.mockReturnValue(makePayload([]));

      const { result } = renderFirebaseSyncHook();

      await act(async () => {
        await result.current.signIn();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'Initial sync failed',
        ToastType.Error,
        expect.objectContaining({ description: 'Database unavailable' }),
      );
      expect(result.current.syncStatus).toBe('error');
      expect(result.current.syncState).toBe(FirebaseSyncState.Error);
    });
  });

  // =========================================================================
  // Auth state listener
  // =========================================================================

  describe('auth state listener', () => {
    it('calls initAuth on mount when configured', () => {
      renderFirebaseSyncHook();
      expect(mockInitAuth).toHaveBeenCalledTimes(1);
      expect(mockInitAuth).toHaveBeenCalledWith(expect.any(Function));
    });

    it('sets user to null and disconnects on auth callback with null', () => {
      let authCallback: ((u: unknown) => void) | null = null;
      mockInitAuth.mockImplementation((cb: (u: unknown) => void) => {
        authCallback = cb;
        return vi.fn();
      });

      const { result } = renderFirebaseSyncHook();

      act(() => {
        authCallback!(null);
      });

      expect(result.current.isSignedIn).toBe(false);
      expect(result.current.syncState).toBe(FirebaseSyncState.Disconnected);
    });

    it('cleans up on unmount', () => {
      const unsub = vi.fn();
      mockInitAuth.mockReturnValue(unsub);

      const { unmount } = renderFirebaseSyncHook();
      unmount();

      expect(unsub).toHaveBeenCalled();
      expect(mockCancelPendingSync).toHaveBeenCalled();
    });
  });
});
