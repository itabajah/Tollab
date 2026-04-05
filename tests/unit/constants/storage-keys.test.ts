/**
 * Tests for storage-keys constants — validates that all localStorage keys
 * are unique, non-empty, and follow the tollab_ prefix convention.
 */

import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('storage-keys constants', () => {
  it('has all expected keys', () => {
    expect(STORAGE_KEYS).toHaveProperty('PROFILES');
    expect(STORAGE_KEYS).toHaveProperty('ACTIVE_PROFILE');
    expect(STORAGE_KEYS).toHaveProperty('DATA_PREFIX');
    expect(STORAGE_KEYS).toHaveProperty('SETTINGS');
  });

  it('has exactly 4 keys', () => {
    expect(Object.keys(STORAGE_KEYS)).toHaveLength(4);
  });

  it('all values are non-empty strings', () => {
    for (const value of Object.values(STORAGE_KEYS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all values are unique', () => {
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('all values start with "tollab_" prefix', () => {
    for (const value of Object.values(STORAGE_KEYS)) {
      expect(value).toMatch(/^tollab_/);
    }
  });

  it('has correct specific values', () => {
    expect(STORAGE_KEYS.PROFILES).toBe('tollab_profiles');
    expect(STORAGE_KEYS.ACTIVE_PROFILE).toBe('tollab_active');
    expect(STORAGE_KEYS.DATA_PREFIX).toBe('tollab_data_');
    expect(STORAGE_KEYS.SETTINGS).toBe('tollab_settings');
  });

  it('DATA_PREFIX ends with underscore for concatenation', () => {
    expect(STORAGE_KEYS.DATA_PREFIX).toMatch(/_$/);
  });

  it('non-prefix values do not end with underscore', () => {
    expect(STORAGE_KEYS.PROFILES).not.toMatch(/_$/);
    expect(STORAGE_KEYS.ACTIVE_PROFILE).not.toMatch(/_$/);
    expect(STORAGE_KEYS.SETTINGS).not.toMatch(/_$/);
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(true);
  });

  it('DATA_PREFIX can be combined with a profile ID', () => {
    const profileId = 'abc-123';
    const key = `${STORAGE_KEYS.DATA_PREFIX}${profileId}`;
    expect(key).toBe('tollab_data_abc-123');
  });
});
