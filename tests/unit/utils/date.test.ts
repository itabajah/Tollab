import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  convertDateFormat,
  parseICSDate,
  getCurrentWeekRange,
  isDateInCurrentWeek,
} from '@/utils/date';

describe('convertDateFormat', () => {
  it('converts dd-MM-yyyy to yyyy-MM-dd', () => {
    expect(convertDateFormat('31-12-2024')).toBe('2024-12-31');
  });

  it('converts single-digit day and month padded strings', () => {
    expect(convertDateFormat('01-01-2024')).toBe('2024-01-01');
  });

  it('returns original string if format does not match', () => {
    expect(convertDateFormat('2024-12-31')).toBe('2024-12-31');
  });

  it('returns empty string for empty input', () => {
    expect(convertDateFormat('')).toBe('');
  });

  it('returns empty string for null input', () => {
    expect(convertDateFormat(null as unknown as string)).toBe('');
  });

  it('returns original for random text', () => {
    expect(convertDateFormat('not-a-date')).toBe('not-a-date');
  });
});

describe('parseICSDate', () => {
  it('parses a standard ICS date string', () => {
    const date = parseICSDate('20241027T103000');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(9); // 0-indexed: October = 9
    expect(date.getDate()).toBe(27);
    expect(date.getHours()).toBe(10);
    expect(date.getMinutes()).toBe(30);
    expect(date.getSeconds()).toBe(0);
  });

  it('parses ICS date with Z suffix (treated as local time)', () => {
    const date = parseICSDate('20241027T103000Z');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(27);
  });

  it('parses midnight correctly', () => {
    const date = parseICSDate('20240101T000000');
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
  });

  it('parses end-of-day correctly', () => {
    const date = parseICSDate('20241231T235959');
    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
    expect(date.getSeconds()).toBe(59);
  });
});

describe('getCurrentWeekRange', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns start (Sunday) and end (Saturday) of the current week', () => {
    // Fix date to Wednesday, 2024-10-23
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 9, 23, 12, 0, 0)); // Wed Oct 23 2024

    const { start, end } = getCurrentWeekRange();

    expect(start.getDay()).toBe(0); // Sunday
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getDay()).toBe(6); // Saturday
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it('returns correct range when today is Sunday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 9, 20, 12, 0, 0)); // Sun Oct 20 2024

    const { start, end } = getCurrentWeekRange();
    expect(start.getDate()).toBe(20);
    expect(end.getDate()).toBe(26);
  });

  it('returns correct range when today is Saturday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 9, 26, 12, 0, 0)); // Sat Oct 26 2024

    const { start, end } = getCurrentWeekRange();
    expect(start.getDate()).toBe(20);
    expect(end.getDate()).toBe(26);
  });
});

describe('isDateInCurrentWeek', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for a date within the current week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 9, 23, 12, 0, 0)); // Wed Oct 23

    expect(isDateInCurrentWeek('2024-10-22')).toBe(true); // Tue
  });

  it('returns false for a date in the previous week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 9, 23, 12, 0, 0));

    expect(isDateInCurrentWeek('2024-10-15')).toBe(false);
  });

  it('returns false for a date in the next week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 9, 23, 12, 0, 0));

    expect(isDateInCurrentWeek('2024-10-28')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDateInCurrentWeek('')).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isDateInCurrentWeek(null as unknown as string)).toBe(false);
  });

  it('returns false for invalid date string', () => {
    expect(isDateInCurrentWeek('not-a-date')).toBe(false);
  });
});
