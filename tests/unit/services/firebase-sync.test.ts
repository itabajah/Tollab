/**
 * Tests for firebase-sync.ts — Firebase Realtime Database sync service.
 *
 * All Firebase SDK functions are mocked. Tests cover payload building,
 * merge logic with conflict resolution, push/pull, echo prevention,
 * debounced sync, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockGet, mockSet, mockOnValue, mockRef } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockOnValue: vi.fn(),
  mockRef: vi.fn((...args: unknown[]) => ({ path: args[1] })),
}));

vi.mock('firebase/database', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
  ref: (...args: unknown[]) => mockRef(...args),
}));

let mockDatabase: unknown = null;
vi.mock('@/services/firebase-config', () => ({
  get database() {
    return mockDatabase;
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  buildLocalPayload,
  mergeLocalAndCloud,
  pushToFirebase,
  pullFromFirebase,
  subscribeToFirebase,
  debouncedSync,
  cancelPendingSync,
  getIsApplyingRemote,
  type AppData,
} from '@/services/firebase-sync';
import type { CloudPayload, CloudProfileEntry } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfileEntry(
  id: string,
  name: string,
  lastModified: string | null = null,
  hasSemesters = true,
): CloudProfileEntry {
  return {
    id,
    name,
    lastModified,
    data: hasSemesters
      ? { semesters: [{ id: 's1', name: 'Test', courses: [], calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] } }], settings: { theme: 'light', showCompleted: true, showWatchedRecordings: true, colorTheme: 'colorful', baseColorHue: 200 }, lastModified: lastModified ?? '' }
      : null,
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

function makeAppData(
  profiles: Array<{ id: string; name: string }> = [],
  activeProfileId = 'p1',
  profilesData: Record<string, unknown> = {},
): AppData {
  return {
    profiles: profiles.map((p) => ({ id: p.id, name: p.name })),
    activeProfileId,
    profilesData: profilesData as Record<string, null>,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('firebase-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockDatabase = null;
    localStorage.clear();
    cancelPendingSync();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // buildLocalPayload
  // =========================================================================

  describe('buildLocalPayload', () => {
    it('builds a payload with version 2 and current timestamp', () => {
      const data = makeAppData([{ id: 'p1', name: 'Main' }], 'p1', {
        p1: { semesters: [], settings: {}, lastModified: '2024-01-01T00:00:00Z' },
      });
      const payload = buildLocalPayload(data);

      expect(payload.version).toBe(2);
      expect(payload.activeProfileId).toBe('p1');
      expect(payload.profiles).toHaveLength(1);
      expect(payload.updatedAt).toBeTruthy();
    });

    it('maps each profile to a CloudProfileEntry', () => {
      const data = makeAppData(
        [
          { id: 'p1', name: 'Alpha' },
          { id: 'p2', name: 'Beta' },
        ],
        'p1',
        {
          p1: { semesters: [], settings: {}, lastModified: '2024-01-01T00:00:00Z' },
          p2: { semesters: [], settings: {}, lastModified: '2024-06-01T00:00:00Z' },
        },
      );
      const payload = buildLocalPayload(data);

      expect(payload.profiles).toHaveLength(2);
      expect(payload.profiles[0]!.id).toBe('p1');
      expect(payload.profiles[0]!.name).toBe('Alpha');
      expect(payload.profiles[1]!.id).toBe('p2');
    });

    it('handles profiles with null data', () => {
      const data = makeAppData([{ id: 'p1', name: 'Empty' }], 'p1', {
        p1: null,
      });
      const payload = buildLocalPayload(data);

      expect(payload.profiles[0]!.data).toBeNull();
      expect(payload.profiles[0]!.lastModified).toBeNull();
    });

    it('handles profiles with missing data key', () => {
      const data = makeAppData([{ id: 'p1', name: 'Missing' }], 'p1', {});
      const payload = buildLocalPayload(data);

      expect(payload.profiles[0]!.data).toBeNull();
    });
  });

  // =========================================================================
  // mergeLocalAndCloud
  // =========================================================================

  describe('mergeLocalAndCloud', () => {
    it('keeps local profile when IDs match and local is newer', () => {
      const local = makePayload([
        makeProfileEntry('p1', 'Local', '2024-06-01T00:00:00Z'),
      ]);
      const cloud = makePayload([
        makeProfileEntry('p1', 'Cloud', '2024-01-01T00:00:00Z'),
      ]);

      const merged = mergeLocalAndCloud(local, cloud);

      expect(merged.profiles).toHaveLength(1);
      expect(merged.profiles[0]!.name).toBe('Local');
    });

    it('takes cloud profile when cloud is newer', () => {
      const local = makePayload([
        makeProfileEntry('p1', 'Local', '2024-01-01T00:00:00Z'),
      ]);
      const cloud = makePayload([
        makeProfileEntry('p1', 'Cloud', '2024-06-01T00:00:00Z'),
      ]);

      const merged = mergeLocalAndCloud(local, cloud);

      expect(merged.profiles).toHaveLength(1);
      expect(merged.profiles[0]!.name).toBe('Cloud');
    });

    it('adds new cloud-only profiles', () => {
      const local = makePayload([
        makeProfileEntry('p1', 'Local', '2024-01-01T00:00:00Z'),
      ]);
      const cloud = makePayload([
        makeProfileEntry('p2', 'Cloud Only', '2024-01-01T00:00:00Z'),
      ]);

      const merged = mergeLocalAndCloud(local, cloud);

      expect(merged.profiles).toHaveLength(2);
      const names = merged.profiles.map((p) => p.name);
      expect(names).toContain('Local');
      expect(names).toContain('Cloud Only');
    });

    it('deduplicates names with (2), (3) suffixes', () => {
      const local = makePayload([
        makeProfileEntry('p1', 'Main', '2024-06-01T00:00:00Z'),
      ]);
      const cloud = makePayload([
        makeProfileEntry('p2', 'Main', '2024-01-01T00:00:00Z'),
      ]);

      const merged = mergeLocalAndCloud(local, cloud);

      expect(merged.profiles).toHaveLength(2);
      const names = merged.profiles.map((p) => p.name);
      expect(names).toContain('Main');
      expect(names).toContain('Main (2)');
    });

    it('handles triple name collision', () => {
      const local = makePayload([
        makeProfileEntry('p1', 'Profile', '2024-06-01T00:00:00Z'),
        makeProfileEntry('p2', 'Profile (2)', '2024-06-01T00:00:00Z'),
      ]);
      const cloud = makePayload([
        makeProfileEntry('p3', 'Profile', '2024-01-01T00:00:00Z'),
      ]);

      const merged = mergeLocalAndCloud(local, cloud);
      const names = merged.profiles.map((p) => p.name);
      expect(names).toContain('Profile');
      expect(names).toContain('Profile (2)');
      expect(names).toContain('Profile (3)');
    });

    it('skips empty profiles (no semesters)', () => {
      const local = makePayload([
        makeProfileEntry('p1', 'Full', '2024-01-01T00:00:00Z'),
      ]);
      const cloud = makePayload([
        makeProfileEntry('p2', 'Empty', null, false),
      ]);

      const merged = mergeLocalAndCloud(local, cloud);

      expect(merged.profiles).toHaveLength(1);
      expect(merged.profiles[0]!.name).toBe('Full');
    });

    it('skips profiles without IDs', () => {
      const local = makePayload([
        makeProfileEntry('p1', 'Valid', '2024-01-01T00:00:00Z'),
      ]);
      const cloud = makePayload([
        { id: '', name: 'No ID', lastModified: null, data: null },
      ]);

      const merged = mergeLocalAndCloud(local, cloud);

      expect(merged.profiles).toHaveLength(1);
    });

    it('preserves local activeProfileId when valid', () => {
      const local = makePayload(
        [makeProfileEntry('p1', 'A', '2024-01-01T00:00:00Z')],
        'p1',
      );
      const cloud = makePayload(
        [makeProfileEntry('p1', 'A', '2024-01-01T00:00:00Z')],
        'p1',
      );

      const merged = mergeLocalAndCloud(local, cloud);
      expect(merged.activeProfileId).toBe('p1');
    });

    it('falls back to cloud activeProfileId when local is invalid', () => {
      const local = makePayload(
        [makeProfileEntry('p1', 'A', '2024-01-01T00:00:00Z')],
        'nonexistent',
      );
      const cloud = makePayload(
        [makeProfileEntry('p1', 'A', '2024-01-01T00:00:00Z')],
        'p1',
      );

      const merged = mergeLocalAndCloud(local, cloud);
      expect(merged.activeProfileId).toBe('p1');
    });

    it('falls back to first profile when both active IDs are invalid', () => {
      const local = makePayload(
        [makeProfileEntry('p1', 'A', '2024-01-01T00:00:00Z')],
        'ghost1',
      );
      const cloud = makePayload(
        [makeProfileEntry('p1', 'A', '2024-01-01T00:00:00Z')],
        'ghost2',
      );

      const merged = mergeLocalAndCloud(local, cloud);
      expect(merged.activeProfileId).toBe('p1');
    });

    it('defaults to "default" when no profiles remain', () => {
      const local = makePayload([], 'ghost');
      const cloud = makePayload([], 'ghost');

      const merged = mergeLocalAndCloud(local, cloud);
      expect(merged.activeProfileId).toBe('default');
    });

    it('handles both null lastModified (treats as equal)', () => {
      const local = makePayload([
        makeProfileEntry('p1', 'Local', null),
      ]);
      const cloud = makePayload([
        makeProfileEntry('p1', 'Cloud', null),
      ]);

      const merged = mergeLocalAndCloud(local, cloud);
      // When equal, local wins
      expect(merged.profiles[0]!.name).toBe('Local');
    });

    it('trims whitespace from profile names', () => {
      const local = makePayload([
        makeProfileEntry('p1', '  Spaced  ', '2024-01-01T00:00:00Z'),
      ]);
      const cloud = makePayload([]);

      const merged = mergeLocalAndCloud(local, cloud);
      expect(merged.profiles[0]!.name).toBe('Spaced');
    });

    it('assigns default "Profile" name to empty-named profiles', () => {
      const local = makePayload([
        makeProfileEntry('p1', '', '2024-01-01T00:00:00Z'),
      ]);
      const cloud = makePayload([]);

      const merged = mergeLocalAndCloud(local, cloud);
      expect(merged.profiles[0]!.name).toBe('Profile');
    });
  });

  // =========================================================================
  // pushToFirebase
  // =========================================================================

  describe('pushToFirebase', () => {
    it('does nothing when database is not configured', async () => {
      const payload = makePayload([]);
      await pushToFirebase('user1', payload);
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('calls set with the correct ref and record structure', async () => {
      mockDatabase = {};
      mockSet.mockResolvedValue(undefined);

      const payload = makePayload([makeProfileEntry('p1', 'Main', '2024-01-01T00:00:00Z')]);
      await pushToFirebase('user1', payload);

      expect(mockRef).toHaveBeenCalledWith(mockDatabase, 'tollab/users/user1/data');
      expect(mockSet).toHaveBeenCalledTimes(1);

      const record = mockSet.mock.calls[0]![1] as Record<string, unknown>;
      expect(record['version']).toBe(2);
      expect(record['payload']).toBe(payload);
      expect(record['writeId']).toBeTruthy();
      expect(record['clientId']).toBeTruthy();
    });

    it('propagates errors from Firebase set', async () => {
      mockDatabase = {};
      mockSet.mockRejectedValue(new Error('Permission denied'));

      const payload = makePayload([]);
      await expect(pushToFirebase('user1', payload)).rejects.toThrow(
        'Permission denied',
      );
    });
  });

  // =========================================================================
  // pullFromFirebase
  // =========================================================================

  describe('pullFromFirebase', () => {
    it('returns null when database is not configured', async () => {
      const result = await pullFromFirebase('user1');
      expect(result).toBeNull();
    });

    it('returns null when no data exists', async () => {
      mockDatabase = {};
      mockGet.mockResolvedValue({ exists: () => false });

      const result = await pullFromFirebase('user1');
      expect(result).toBeNull();
    });

    it('returns null when snapshot value is null', async () => {
      mockDatabase = {};
      mockGet.mockResolvedValue({ exists: () => true, val: () => null });

      const result = await pullFromFirebase('user1');
      expect(result).toBeNull();
    });

    it('returns null for invalid cloud payload shape', async () => {
      mockDatabase = {};
      mockGet.mockResolvedValue({
        exists: () => true,
        val: () => ({ payload: { notValid: true } }),
      });

      const result = await pullFromFirebase('user1');
      expect(result).toBeNull();
    });

    it('returns valid cloud payload from wrapped record', async () => {
      mockDatabase = {};
      const validPayload = {
        version: 2,
        updatedAt: '2024-01-01T00:00:00Z',
        activeProfileId: 'p1',
        profiles: [],
      };
      mockGet.mockResolvedValue({
        exists: () => true,
        val: () => ({ payload: validPayload }),
      });

      const result = await pullFromFirebase('user1');
      expect(result).toEqual(validPayload);
    });

    it('handles raw payload without wrapping', async () => {
      mockDatabase = {};
      const rawPayload = {
        version: 2,
        updatedAt: '2024-01-01T00:00:00Z',
        activeProfileId: 'p1',
        profiles: [],
      };
      mockGet.mockResolvedValue({
        exists: () => true,
        val: () => rawPayload,
      });

      const result = await pullFromFirebase('user1');
      expect(result).toEqual(rawPayload);
    });

    it('rejects payload missing version field', async () => {
      mockDatabase = {};
      mockGet.mockResolvedValue({
        exists: () => true,
        val: () => ({
          payload: {
            updatedAt: '2024-01-01T00:00:00Z',
            activeProfileId: 'p1',
            profiles: [],
          },
        }),
      });

      const result = await pullFromFirebase('user1');
      expect(result).toBeNull();
    });

    it('rejects payload with non-array profiles', async () => {
      mockDatabase = {};
      mockGet.mockResolvedValue({
        exists: () => true,
        val: () => ({
          payload: {
            version: 2,
            updatedAt: '2024-01-01T00:00:00Z',
            activeProfileId: 'p1',
            profiles: 'not-an-array',
          },
        }),
      });

      const result = await pullFromFirebase('user1');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // subscribeToFirebase
  // =========================================================================

  describe('subscribeToFirebase', () => {
    it('returns null when database is not configured', () => {
      const callback = vi.fn();
      const result = subscribeToFirebase('user1', callback);
      expect(result).toBeNull();
    });

    it('returns unsubscribe function when configured', () => {
      mockDatabase = {};
      const unsub = vi.fn();
      mockOnValue.mockReturnValue(unsub);

      const callback = vi.fn();
      const result = subscribeToFirebase('user1', callback);

      expect(result).toBe(unsub);
      expect(mockOnValue).toHaveBeenCalledTimes(1);
    });

    it('invokes callback with valid remote payload', () => {
      mockDatabase = {};
      mockOnValue.mockImplementation((_ref: unknown, handler: (snap: unknown) => void) => {
        handler({
          exists: () => true,
          val: () => ({
            writeId: 'remote-write-id',
            clientId: 'remote-client-id',
            payload: {
              version: 2,
              updatedAt: '2024-01-01T00:00:00Z',
              activeProfileId: 'p1',
              profiles: [],
            },
          }),
        });
        return vi.fn();
      });

      const callback = vi.fn();
      subscribeToFirebase('user1', callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0]![0]).toHaveProperty('version', 2);
    });

    it('ignores snapshots that do not exist', () => {
      mockDatabase = {};
      mockOnValue.mockImplementation((_ref: unknown, handler: (snap: unknown) => void) => {
        handler({ exists: () => false });
        return vi.fn();
      });

      const callback = vi.fn();
      subscribeToFirebase('user1', callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('ignores invalid payload shape', () => {
      mockDatabase = {};
      mockOnValue.mockImplementation((_ref: unknown, handler: (snap: unknown) => void) => {
        handler({
          exists: () => true,
          val: () => ({
            writeId: 'w1',
            clientId: 'c1',
            payload: { invalid: true },
          }),
        });
        return vi.fn();
      });

      const callback = vi.fn();
      subscribeToFirebase('user1', callback);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // debouncedSync & cancelPendingSync
  // =========================================================================

  describe('debouncedSync', () => {
    it('does not push immediately — waits for debounce', () => {
      mockDatabase = {};
      mockSet.mockResolvedValue(undefined);

      const data = makeAppData([{ id: 'p1', name: 'Main' }], 'p1', {
        p1: { semesters: [], settings: {}, lastModified: '' },
      });
      debouncedSync('user1', data);

      expect(mockSet).not.toHaveBeenCalled();
    });

    it('pushes after 750ms debounce', async () => {
      mockDatabase = {};
      mockSet.mockResolvedValue(undefined);

      const data = makeAppData([{ id: 'p1', name: 'Main' }], 'p1', {
        p1: { semesters: [], settings: {}, lastModified: '' },
      });
      debouncedSync('user1', data);

      await vi.advanceTimersByTimeAsync(750);

      expect(mockSet).toHaveBeenCalledTimes(1);
    });

    it('resets timer on subsequent calls', async () => {
      mockDatabase = {};
      mockSet.mockResolvedValue(undefined);

      const data = makeAppData([{ id: 'p1', name: 'Main' }], 'p1', {
        p1: { semesters: [], settings: {}, lastModified: '' },
      });

      debouncedSync('user1', data);
      await vi.advanceTimersByTimeAsync(500);
      debouncedSync('user1', data); // resets timer
      await vi.advanceTimersByTimeAsync(500);

      expect(mockSet).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(250);
      expect(mockSet).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelPendingSync', () => {
    it('cancels a pending debounced sync', async () => {
      mockDatabase = {};
      mockSet.mockResolvedValue(undefined);

      const data = makeAppData([{ id: 'p1', name: 'Main' }], 'p1', {
        p1: { semesters: [], settings: {}, lastModified: '' },
      });
      debouncedSync('user1', data);
      cancelPendingSync();

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('is safe to call when no sync is pending', () => {
      expect(() => cancelPendingSync()).not.toThrow();
    });
  });

  // =========================================================================
  // getIsApplyingRemote
  // =========================================================================

  describe('getIsApplyingRemote', () => {
    it('returns false by default', () => {
      expect(getIsApplyingRemote()).toBe(false);
    });
  });
});
