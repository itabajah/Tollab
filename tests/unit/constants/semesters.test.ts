/**
 * Tests for semesters constants — seasons and Hebrew translations.
 */

import { describe, it, expect } from 'vitest';
import { SEMESTER_SEASONS, SEMESTER_TRANSLATIONS } from '@/constants/semesters';

describe('semesters constants', () => {
  // =========================================================================
  // SEMESTER_SEASONS
  // =========================================================================

  describe('SEMESTER_SEASONS', () => {
    it('has exactly 3 seasons', () => {
      expect(SEMESTER_SEASONS).toHaveLength(3);
    });

    it('contains Winter, Spring, Summer', () => {
      expect(SEMESTER_SEASONS).toContain('Winter');
      expect(SEMESTER_SEASONS).toContain('Spring');
      expect(SEMESTER_SEASONS).toContain('Summer');
    });

    it('all values are unique', () => {
      expect(new Set(SEMESTER_SEASONS).size).toBe(3);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(SEMESTER_SEASONS)).toBe(true);
    });
  });

  // =========================================================================
  // SEMESTER_TRANSLATIONS
  // =========================================================================

  describe('SEMESTER_TRANSLATIONS', () => {
    it('has exactly 3 translations', () => {
      expect(Object.keys(SEMESTER_TRANSLATIONS)).toHaveLength(3);
    });

    it('translates אביב to Spring', () => {
      expect(SEMESTER_TRANSLATIONS['אביב']).toBe('Spring');
    });

    it('translates חורף to Winter', () => {
      expect(SEMESTER_TRANSLATIONS['חורף']).toBe('Winter');
    });

    it('translates קיץ to Summer', () => {
      expect(SEMESTER_TRANSLATIONS['קיץ']).toBe('Summer');
    });

    it('all translated values appear in SEMESTER_SEASONS', () => {
      for (const value of Object.values(SEMESTER_TRANSLATIONS)) {
        expect(SEMESTER_SEASONS).toContain(value);
      }
    });

    it('covers all SEMESTER_SEASONS values', () => {
      const translatedValues = new Set(Object.values(SEMESTER_TRANSLATIONS));
      for (const season of SEMESTER_SEASONS) {
        expect(translatedValues.has(season)).toBe(true);
      }
    });

    it('is frozen', () => {
      expect(Object.isFrozen(SEMESTER_TRANSLATIONS)).toBe(true);
    });
  });
});
