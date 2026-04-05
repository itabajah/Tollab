/**
 * Tests for calendar constants — day name arrays and default settings.
 */

import { describe, it, expect } from 'vitest';
import {
  DAY_NAMES,
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  DEFAULT_CALENDAR_SETTINGS,
} from '@/constants/calendar';

describe('calendar constants', () => {
  // =========================================================================
  // DAY_NAMES
  // =========================================================================

  describe('DAY_NAMES', () => {
    it('has 7 days', () => {
      expect(DAY_NAMES).toHaveLength(7);
    });

    it('starts with Sunday', () => {
      expect(DAY_NAMES[0]).toBe('Sun');
    });

    it('ends with Saturday', () => {
      expect(DAY_NAMES[6]).toBe('Sat');
    });

    it('all entries are non-empty strings', () => {
      for (const day of DAY_NAMES) {
        expect(typeof day).toBe('string');
        expect(day.length).toBeGreaterThan(0);
      }
    });

    it('all entries are unique', () => {
      expect(new Set(DAY_NAMES).size).toBe(7);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(DAY_NAMES)).toBe(true);
    });
  });

  // =========================================================================
  // DAY_NAMES_FULL
  // =========================================================================

  describe('DAY_NAMES_FULL', () => {
    it('has 7 days', () => {
      expect(DAY_NAMES_FULL).toHaveLength(7);
    });

    it('starts with Sunday', () => {
      expect(DAY_NAMES_FULL[0]).toBe('Sunday');
    });

    it('ends with Saturday', () => {
      expect(DAY_NAMES_FULL[6]).toBe('Saturday');
    });

    it('contains Wednesday', () => {
      expect(DAY_NAMES_FULL).toContain('Wednesday');
    });

    it('all entries are unique', () => {
      expect(new Set(DAY_NAMES_FULL).size).toBe(7);
    });

    it('full names are longer than abbreviated names', () => {
      for (let i = 0; i < 7; i++) {
        expect(DAY_NAMES_FULL[i]!.length).toBeGreaterThan(DAY_NAMES[i]!.length);
      }
    });

    it('is frozen', () => {
      expect(Object.isFrozen(DAY_NAMES_FULL)).toBe(true);
    });
  });

  // =========================================================================
  // DAY_NAMES_SHORT
  // =========================================================================

  describe('DAY_NAMES_SHORT', () => {
    it('has 7 days', () => {
      expect(DAY_NAMES_SHORT).toHaveLength(7);
    });

    it('matches DAY_NAMES exactly', () => {
      expect([...DAY_NAMES_SHORT]).toEqual([...DAY_NAMES]);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(DAY_NAMES_SHORT)).toBe(true);
    });
  });

  // =========================================================================
  // DEFAULT_CALENDAR_SETTINGS
  // =========================================================================

  describe('DEFAULT_CALENDAR_SETTINGS', () => {
    it('has all required keys', () => {
      expect(DEFAULT_CALENDAR_SETTINGS).toHaveProperty('startHour');
      expect(DEFAULT_CALENDAR_SETTINGS).toHaveProperty('endHour');
      expect(DEFAULT_CALENDAR_SETTINGS).toHaveProperty('visibleDays');
    });

    it('startHour is 8', () => {
      expect(DEFAULT_CALENDAR_SETTINGS.startHour).toBe(8);
    });

    it('endHour is 20', () => {
      expect(DEFAULT_CALENDAR_SETTINGS.endHour).toBe(20);
    });

    it('endHour > startHour', () => {
      expect(DEFAULT_CALENDAR_SETTINGS.endHour).toBeGreaterThan(
        DEFAULT_CALENDAR_SETTINGS.startHour,
      );
    });

    it('startHour is in valid range (0-23)', () => {
      expect(DEFAULT_CALENDAR_SETTINGS.startHour).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CALENDAR_SETTINGS.startHour).toBeLessThanOrEqual(23);
    });

    it('endHour is in valid range (0-23)', () => {
      expect(DEFAULT_CALENDAR_SETTINGS.endHour).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CALENDAR_SETTINGS.endHour).toBeLessThanOrEqual(23);
    });

    it('visibleDays includes Sunday through Friday (0-5)', () => {
      expect(DEFAULT_CALENDAR_SETTINGS.visibleDays).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('visibleDays excludes Saturday by default', () => {
      expect(DEFAULT_CALENDAR_SETTINGS.visibleDays).not.toContain(6);
    });

    it('visibleDays values are unique', () => {
      const days = DEFAULT_CALENDAR_SETTINGS.visibleDays;
      expect(new Set(days).size).toBe(days.length);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(DEFAULT_CALENDAR_SETTINGS)).toBe(true);
    });
  });
});
