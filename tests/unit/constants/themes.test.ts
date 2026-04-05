/**
 * Tests for themes constants — validates color themes, defaults, and the
 * golden angle constant for course color generation.
 */

import { describe, it, expect } from 'vitest';
import { COLOR_THEMES, DEFAULT_THEME_SETTINGS, GOLDEN_ANGLE } from '@/constants/themes';
import { ColorTheme, ThemeMode } from '@/types';

describe('themes constants', () => {
  // =========================================================================
  // COLOR_THEMES
  // =========================================================================

  describe('COLOR_THEMES', () => {
    it('has all expected keys', () => {
      expect(COLOR_THEMES).toHaveProperty('COLORFUL');
      expect(COLOR_THEMES).toHaveProperty('SINGLE');
      expect(COLOR_THEMES).toHaveProperty('MONO');
    });

    it('has exactly 3 themes', () => {
      expect(Object.keys(COLOR_THEMES)).toHaveLength(3);
    });

    it('maps to correct ColorTheme enum values', () => {
      expect(COLOR_THEMES.COLORFUL).toBe(ColorTheme.Colorful);
      expect(COLOR_THEMES.SINGLE).toBe(ColorTheme.Single);
      expect(COLOR_THEMES.MONO).toBe(ColorTheme.Mono);
    });

    it('has all unique values', () => {
      const values = Object.values(COLOR_THEMES);
      expect(new Set(values).size).toBe(values.length);
    });

    it('values are non-empty strings', () => {
      for (const value of Object.values(COLOR_THEMES)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(COLOR_THEMES)).toBe(true);
    });
  });

  // =========================================================================
  // DEFAULT_THEME_SETTINGS
  // =========================================================================

  describe('DEFAULT_THEME_SETTINGS', () => {
    it('has all required settings keys', () => {
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty('theme');
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty('showCompleted');
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty('showWatchedRecordings');
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty('colorTheme');
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty('baseColorHue');
    });

    it('defaults to light theme', () => {
      expect(DEFAULT_THEME_SETTINGS.theme).toBe(ThemeMode.Light);
    });

    it('defaults showCompleted to true', () => {
      expect(DEFAULT_THEME_SETTINGS.showCompleted).toBe(true);
    });

    it('defaults showWatchedRecordings to false', () => {
      expect(DEFAULT_THEME_SETTINGS.showWatchedRecordings).toBe(false);
    });

    it('defaults to colorful color theme', () => {
      expect(DEFAULT_THEME_SETTINGS.colorTheme).toBe(ColorTheme.Colorful);
    });

    it('defaults baseColorHue to 200', () => {
      expect(DEFAULT_THEME_SETTINGS.baseColorHue).toBe(200);
    });

    it('baseColorHue is within valid HSL range (0-360)', () => {
      expect(DEFAULT_THEME_SETTINGS.baseColorHue).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_THEME_SETTINGS.baseColorHue).toBeLessThanOrEqual(360);
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(DEFAULT_THEME_SETTINGS)).toBe(true);
    });
  });

  // =========================================================================
  // GOLDEN_ANGLE
  // =========================================================================

  describe('GOLDEN_ANGLE', () => {
    it('is 137', () => {
      expect(GOLDEN_ANGLE).toBe(137);
    });

    it('is a number', () => {
      expect(typeof GOLDEN_ANGLE).toBe('number');
    });

    it('produces distinct hues for sequential courses', () => {
      const hues = Array.from({ length: 10 }, (_, i) => (i * GOLDEN_ANGLE) % 360);
      const uniqueHues = new Set(hues);
      expect(uniqueHues.size).toBe(hues.length);
    });
  });
});
