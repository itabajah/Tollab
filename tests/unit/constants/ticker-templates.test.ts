/**
 * Tests for ticker-templates constants — validates all template categories
 * exist, have non-empty arrays, and use valid placeholder syntax.
 */

import { describe, it, expect } from 'vitest';
import { HEADER_TICKER_TEMPLATES } from '@/constants/ticker-templates';
import type { TickerCategory } from '@/types';

const ALL_CATEGORIES: TickerCategory[] = [
  'no_semester', 'no_courses', 'no_schedule', 'no_classes_today', 'all_clear',
  'late_night', 'morning', 'weekend',
  'class_now', 'class_soon', 'class_next', 'class_tomorrow',
  'hw_nodate', 'hw_many', 'hw_all_done', 'hw_overdue', 'hw_today', 'hw_tomorrow', 'hw_soon',
  'exam', 'exam_today', 'exam_tomorrow', 'exam_soon',
  'recordings_backlog', 'recordings_big', 'recordings_clear',
  'general', 'general_course_roast',
];

describe('ticker-templates constants', () => {
  it('has all expected categories', () => {
    for (const cat of ALL_CATEGORIES) {
      expect(HEADER_TICKER_TEMPLATES).toHaveProperty(cat);
    }
  });

  it('has no unexpected categories', () => {
    const keys = Object.keys(HEADER_TICKER_TEMPLATES);
    for (const key of keys) {
      expect(ALL_CATEGORIES).toContain(key);
    }
  });

  it('every category has at least 1 template', () => {
    for (const cat of ALL_CATEGORIES) {
      const templates = HEADER_TICKER_TEMPLATES[cat];
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('all templates are non-empty strings', () => {
    for (const cat of ALL_CATEGORIES) {
      for (const tmpl of HEADER_TICKER_TEMPLATES[cat]) {
        expect(typeof tmpl).toBe('string');
        expect(tmpl.length).toBeGreaterThan(0);
      }
    }
  });

  it('placeholders use {name} syntax', () => {
    const validPlaceholders = new Set([
      'name', 'time', 'courseMaybe', 'days', 'minutes', 'count',
      'countMinusOne', 'title', 'start', 'end', 'examType', 'date',
    ]);

    for (const cat of ALL_CATEGORIES) {
      for (const tmpl of HEADER_TICKER_TEMPLATES[cat]) {
        const matches = tmpl.match(/\{(\w+)\}/g) ?? [];
        for (const match of matches) {
          const placeholder = match.slice(1, -1);
          expect(validPlaceholders).toContain(placeholder);
        }
      }
    }
  });

  it('class_now templates reference time placeholders', () => {
    const templates = HEADER_TICKER_TEMPLATES.class_now;
    const hasTimePlaceholder = templates.some(
      (t) => t.includes('{start}') || t.includes('{end}'),
    );
    expect(hasTimePlaceholder).toBe(true);
  });

  it('hw_overdue templates reference {title}', () => {
    const templates = HEADER_TICKER_TEMPLATES.hw_overdue;
    const hasTitlePlaceholder = templates.some((t) => t.includes('{title}'));
    expect(hasTitlePlaceholder).toBe(true);
  });

  it('exam templates reference {examType}', () => {
    const templates = HEADER_TICKER_TEMPLATES.exam;
    const hasExamType = templates.some((t) => t.includes('{examType}'));
    expect(hasExamType).toBe(true);
  });

  it('total template count exceeds 100', () => {
    let total = 0;
    for (const cat of ALL_CATEGORIES) {
      total += HEADER_TICKER_TEMPLATES[cat].length;
    }
    expect(total).toBeGreaterThan(100);
  });
});
