/**
 * Tests for sort-orders constants — validates sort order value integrity
 * and type-safety for recordings and homework.
 */

import { describe, it, expect } from 'vitest';
import {
  RECORDING_SORT_ORDERS,
  HOMEWORK_SORT_ORDERS,
  SORT_ORDERS,
} from '@/constants/sort-orders';

describe('sort-orders constants', () => {
  // =========================================================================
  // RECORDING_SORT_ORDERS
  // =========================================================================

  describe('RECORDING_SORT_ORDERS', () => {
    it('has all expected keys', () => {
      const keys = Object.keys(RECORDING_SORT_ORDERS);
      expect(keys).toContain('DEFAULT');
      expect(keys).toContain('MANUAL');
      expect(keys).toContain('NAME_ASC');
      expect(keys).toContain('NAME_DESC');
      expect(keys).toContain('WATCHED_FIRST');
      expect(keys).toContain('UNWATCHED_FIRST');
    });

    it('has exactly 6 sort orders', () => {
      expect(Object.keys(RECORDING_SORT_ORDERS)).toHaveLength(6);
    });

    it('has all unique values', () => {
      const values = Object.values(RECORDING_SORT_ORDERS);
      expect(new Set(values).size).toBe(values.length);
    });

    it('values are non-empty strings', () => {
      for (const value of Object.values(RECORDING_SORT_ORDERS)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('has correct specific values', () => {
      expect(RECORDING_SORT_ORDERS.DEFAULT).toBe('default');
      expect(RECORDING_SORT_ORDERS.MANUAL).toBe('manual');
      expect(RECORDING_SORT_ORDERS.NAME_ASC).toBe('name_asc');
      expect(RECORDING_SORT_ORDERS.NAME_DESC).toBe('name_desc');
      expect(RECORDING_SORT_ORDERS.WATCHED_FIRST).toBe('watched_first');
      expect(RECORDING_SORT_ORDERS.UNWATCHED_FIRST).toBe('unwatched_first');
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(RECORDING_SORT_ORDERS)).toBe(true);
    });
  });

  // =========================================================================
  // HOMEWORK_SORT_ORDERS
  // =========================================================================

  describe('HOMEWORK_SORT_ORDERS', () => {
    it('has all expected keys', () => {
      const keys = Object.keys(HOMEWORK_SORT_ORDERS);
      expect(keys).toContain('MANUAL');
      expect(keys).toContain('DATE_ASC');
      expect(keys).toContain('DATE_DESC');
      expect(keys).toContain('COMPLETED_FIRST');
      expect(keys).toContain('INCOMPLETE_FIRST');
      expect(keys).toContain('NAME_ASC');
    });

    it('has exactly 6 sort orders', () => {
      expect(Object.keys(HOMEWORK_SORT_ORDERS)).toHaveLength(6);
    });

    it('has all unique values', () => {
      const values = Object.values(HOMEWORK_SORT_ORDERS);
      expect(new Set(values).size).toBe(values.length);
    });

    it('values are non-empty strings', () => {
      for (const value of Object.values(HOMEWORK_SORT_ORDERS)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('has correct specific values', () => {
      expect(HOMEWORK_SORT_ORDERS.MANUAL).toBe('manual');
      expect(HOMEWORK_SORT_ORDERS.DATE_ASC).toBe('date_asc');
      expect(HOMEWORK_SORT_ORDERS.DATE_DESC).toBe('date_desc');
      expect(HOMEWORK_SORT_ORDERS.COMPLETED_FIRST).toBe('completed_first');
      expect(HOMEWORK_SORT_ORDERS.INCOMPLETE_FIRST).toBe('incomplete_first');
      expect(HOMEWORK_SORT_ORDERS.NAME_ASC).toBe('name_asc');
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(HOMEWORK_SORT_ORDERS)).toBe(true);
    });
  });

  // =========================================================================
  // SORT_ORDERS (combined)
  // =========================================================================

  describe('SORT_ORDERS', () => {
    it('has recordings and homework keys', () => {
      expect(SORT_ORDERS).toHaveProperty('recordings');
      expect(SORT_ORDERS).toHaveProperty('homework');
    });

    it('recordings matches RECORDING_SORT_ORDERS', () => {
      expect(SORT_ORDERS.recordings).toBe(RECORDING_SORT_ORDERS);
    });

    it('homework matches HOMEWORK_SORT_ORDERS', () => {
      expect(SORT_ORDERS.homework).toBe(HOMEWORK_SORT_ORDERS);
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(SORT_ORDERS)).toBe(true);
    });

    it('has exactly 2 top-level keys', () => {
      expect(Object.keys(SORT_ORDERS)).toHaveLength(2);
    });
  });
});
