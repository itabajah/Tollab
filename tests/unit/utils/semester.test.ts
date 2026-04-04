import { describe, it, expect } from 'vitest';
import { compareSemesters, extractYear, getSeasonValue } from '@/utils/semester';

describe('compareSemesters', () => {
  it('sorts newer year before older year', () => {
    expect(compareSemesters('Winter 2025', 'Winter 2024')).toBeLessThan(0);
  });

  it('sorts older year after newer year', () => {
    expect(compareSemesters('Winter 2024', 'Winter 2025')).toBeGreaterThan(0);
  });

  it('sorts Winter > Summer > Spring within same year', () => {
    expect(compareSemesters('Winter 2024', 'Summer 2024')).toBeLessThan(0);
    expect(compareSemesters('Summer 2024', 'Spring 2024')).toBeLessThan(0);
    expect(compareSemesters('Winter 2024', 'Spring 2024')).toBeLessThan(0);
  });

  it('returns 0 for identical semesters', () => {
    expect(compareSemesters('Winter 2024', 'Winter 2024')).toBe(0);
  });

  it('handles Hebrew semester names', () => {
    expect(compareSemesters('חורף 2024', 'אביב 2024')).toBeLessThan(0);
  });

  it('handles semesters with no recognized season', () => {
    expect(compareSemesters('Unknown 2024', 'Unknown 2024')).toBe(0);
  });

  it('handles semesters with no year (season only)', () => {
    expect(compareSemesters('Winter', 'Spring')).toBeLessThan(0);
  });
});

describe('getSeasonValue', () => {
  it('returns 1 for Spring', () => {
    expect(getSeasonValue('Spring 2024')).toBe(1);
  });

  it('returns 2 for Summer', () => {
    expect(getSeasonValue('Summer 2024')).toBe(2);
  });

  it('returns 3 for Winter', () => {
    expect(getSeasonValue('Winter 2024')).toBe(3);
  });

  it('returns 1 for Hebrew Spring (אביב)', () => {
    expect(getSeasonValue('אביב')).toBe(1);
  });

  it('returns 3 for Hebrew Winter (חורף)', () => {
    expect(getSeasonValue('חורף')).toBe(3);
  });

  it('returns 0 for unknown season', () => {
    expect(getSeasonValue('Fall')).toBe(0);
  });
});

describe('extractYear', () => {
  it('extracts a 4-digit year from a semester name', () => {
    expect(extractYear('Winter 2024')).toBe(2024);
  });

  it('extracts year from Hebrew semester name', () => {
    expect(extractYear('חורף 2025')).toBe(2025);
  });

  it('returns 0 when no year is found', () => {
    expect(extractYear('Winter')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(extractYear('')).toBe(0);
  });

  it('extracts first year when multiple are present', () => {
    expect(extractYear('2023-2024 Winter')).toBe(2023);
  });

  it('returns 0 for null input (throws — source expects string)', () => {
    expect(() => extractYear(null as unknown as string)).toThrow();
  });
});
