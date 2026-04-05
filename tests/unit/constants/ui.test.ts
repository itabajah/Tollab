/**
 * Tests for UI constants — animation durations, timer intervals,
 * recording tab defaults, toast config, and misc UI values.
 */

import { describe, it, expect } from 'vitest';
import {
  ANIMATION_DURATIONS,
  TIME_UPDATE_INTERVAL,
  MAX_LENGTHS,
  DEFAULT_RECORDING_TABS,
  PROTECTED_TAB_IDS,
  TOAST_CONFIG,
  HEADER_TICKER_ROTATE_MS,
  HEADER_TICKER_RECENT_LIMIT,
  EXPORT_DATA_VERSION,
  MOBILE_BREAKPOINT,
} from '@/constants/ui';

describe('UI constants', () => {
  // =========================================================================
  // ANIMATION_DURATIONS
  // =========================================================================

  describe('ANIMATION_DURATIONS', () => {
    it('has all expected keys', () => {
      expect(ANIMATION_DURATIONS).toHaveProperty('MODAL_TRANSITION');
      expect(ANIMATION_DURATIONS).toHaveProperty('HIGHLIGHT_PULSE');
      expect(ANIMATION_DURATIONS).toHaveProperty('FETCH_SUCCESS_DELAY');
    });

    it('all values are positive numbers in milliseconds', () => {
      for (const value of Object.values(ANIMATION_DURATIONS)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      }
    });

    it('MODAL_TRANSITION is reasonable (100-1000ms)', () => {
      expect(ANIMATION_DURATIONS.MODAL_TRANSITION).toBeGreaterThanOrEqual(100);
      expect(ANIMATION_DURATIONS.MODAL_TRANSITION).toBeLessThanOrEqual(1000);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(ANIMATION_DURATIONS)).toBe(true);
    });
  });

  // =========================================================================
  // TIME_UPDATE_INTERVAL
  // =========================================================================

  describe('TIME_UPDATE_INTERVAL', () => {
    it('is 60 seconds in milliseconds', () => {
      expect(TIME_UPDATE_INTERVAL).toBe(60_000);
    });
  });

  // =========================================================================
  // MAX_LENGTHS
  // =========================================================================

  describe('MAX_LENGTHS', () => {
    it('has all expected keys', () => {
      expect(MAX_LENGTHS).toHaveProperty('EVENT_CHIP_TITLE');
      expect(MAX_LENGTHS).toHaveProperty('SIDEBAR_LINKS_DISPLAY');
      expect(MAX_LENGTHS).toHaveProperty('SIDEBAR_LINKS_INITIAL');
    });

    it('all values are positive integers', () => {
      for (const value of Object.values(MAX_LENGTHS)) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }
    });

    it('SIDEBAR_LINKS_INITIAL <= SIDEBAR_LINKS_DISPLAY', () => {
      expect(MAX_LENGTHS.SIDEBAR_LINKS_INITIAL).toBeLessThanOrEqual(
        MAX_LENGTHS.SIDEBAR_LINKS_DISPLAY,
      );
    });

    it('is frozen', () => {
      expect(Object.isFrozen(MAX_LENGTHS)).toBe(true);
    });
  });

  // =========================================================================
  // DEFAULT_RECORDING_TABS
  // =========================================================================

  describe('DEFAULT_RECORDING_TABS', () => {
    it('has exactly 2 tabs', () => {
      expect(DEFAULT_RECORDING_TABS).toHaveLength(2);
    });

    it('includes Lectures tab', () => {
      const lectures = DEFAULT_RECORDING_TABS.find((t) => t.id === 'lectures');
      expect(lectures).toBeDefined();
      expect(lectures!.name).toBe('Lectures');
    });

    it('includes Tutorials tab', () => {
      const tutorials = DEFAULT_RECORDING_TABS.find((t) => t.id === 'tutorials');
      expect(tutorials).toBeDefined();
      expect(tutorials!.name).toBe('Tutorials');
    });

    it('all tabs have id and name', () => {
      for (const tab of DEFAULT_RECORDING_TABS) {
        expect(typeof tab.id).toBe('string');
        expect(tab.id.length).toBeGreaterThan(0);
        expect(typeof tab.name).toBe('string');
        expect(tab.name.length).toBeGreaterThan(0);
      }
    });

    it('tab ids are unique', () => {
      const ids = DEFAULT_RECORDING_TABS.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // =========================================================================
  // PROTECTED_TAB_IDS
  // =========================================================================

  describe('PROTECTED_TAB_IDS', () => {
    it('is a Set', () => {
      expect(PROTECTED_TAB_IDS).toBeInstanceOf(Set);
    });

    it('contains lectures', () => {
      expect(PROTECTED_TAB_IDS.has('lectures')).toBe(true);
    });

    it('contains tutorials', () => {
      expect(PROTECTED_TAB_IDS.has('tutorials')).toBe(true);
    });

    it('has exactly 2 protected IDs', () => {
      expect(PROTECTED_TAB_IDS.size).toBe(2);
    });

    it('matches DEFAULT_RECORDING_TABS ids', () => {
      for (const tab of DEFAULT_RECORDING_TABS) {
        expect(PROTECTED_TAB_IDS.has(tab.id)).toBe(true);
      }
    });

    it('does not contain arbitrary IDs', () => {
      expect(PROTECTED_TAB_IDS.has('custom')).toBe(false);
      expect(PROTECTED_TAB_IDS.has('')).toBe(false);
    });
  });

  // =========================================================================
  // TOAST_CONFIG
  // =========================================================================

  describe('TOAST_CONFIG', () => {
    it('has all expected keys', () => {
      expect(TOAST_CONFIG).toHaveProperty('DEFAULT_DURATION');
      expect(TOAST_CONFIG).toHaveProperty('ERROR_DURATION');
      expect(TOAST_CONFIG).toHaveProperty('MAX_VISIBLE');
      expect(TOAST_CONFIG).toHaveProperty('ANIMATION_DURATION');
      expect(TOAST_CONFIG).toHaveProperty('POSITION');
    });

    it('ERROR_DURATION >= DEFAULT_DURATION', () => {
      expect(TOAST_CONFIG.ERROR_DURATION).toBeGreaterThanOrEqual(
        TOAST_CONFIG.DEFAULT_DURATION,
      );
    });

    it('MAX_VISIBLE is a positive integer', () => {
      expect(TOAST_CONFIG.MAX_VISIBLE).toBeGreaterThan(0);
      expect(Number.isInteger(TOAST_CONFIG.MAX_VISIBLE)).toBe(true);
    });

    it('POSITION is a valid position string', () => {
      const validPositions = [
        'top-left', 'top-right', 'top-center',
        'bottom-left', 'bottom-right', 'bottom-center',
      ];
      expect(validPositions).toContain(TOAST_CONFIG.POSITION);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(TOAST_CONFIG)).toBe(true);
    });
  });

  // =========================================================================
  // Other scalars
  // =========================================================================

  describe('scalar constants', () => {
    it('HEADER_TICKER_ROTATE_MS is positive', () => {
      expect(HEADER_TICKER_ROTATE_MS).toBeGreaterThan(0);
    });

    it('HEADER_TICKER_RECENT_LIMIT is positive', () => {
      expect(HEADER_TICKER_RECENT_LIMIT).toBeGreaterThan(0);
    });

    it('EXPORT_DATA_VERSION is a positive integer', () => {
      expect(Number.isInteger(EXPORT_DATA_VERSION)).toBe(true);
      expect(EXPORT_DATA_VERSION).toBeGreaterThan(0);
    });

    it('MOBILE_BREAKPOINT is reasonable (300-1200px)', () => {
      expect(MOBILE_BREAKPOINT).toBeGreaterThanOrEqual(300);
      expect(MOBILE_BREAKPOINT).toBeLessThanOrEqual(1200);
    });
  });
});
