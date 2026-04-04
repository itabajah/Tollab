import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateCourseName,
  validateHomeworkTitle,
  validateUrl,
  validateVideoUrl,
  validateNumber,
  validateDate,
  validateTime,
  validateImportedData,
} from '@/utils/validation';

// ---------------------------------------------------------------------------
// validateString
// ---------------------------------------------------------------------------
describe('validateString', () => {
  it('passes a valid required string', () => {
    const r = validateString('Hello World', { required: true });
    expect(r.valid).toBe(true);
    expect(r.value).toBe('Hello World');
  });

  it('fails on empty string when required', () => {
    const r = validateString('', { required: true });
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('trims whitespace by default', () => {
    const r = validateString('  test  ');
    expect(r.value).toBe('test');
  });

  it('enforces maxLength', () => {
    const r = validateString('12345', { maxLength: 3 });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('3');
  });

  it('enforces minLength', () => {
    const r = validateString('ab', { minLength: 5, required: true });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('5');
  });

  it('allows empty optional fields', () => {
    const r = validateString('', { required: false, allowEmpty: true });
    expect(r.valid).toBe(true);
  });

  it('validates pattern and returns custom message', () => {
    const r = validateString('test123', {
      pattern: /^[a-z]+$/,
      patternMessage: 'Letters only',
    });
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Letters only');
  });

  it('handles null input gracefully', () => {
    const r = validateString(null as unknown as string, { allowEmpty: true });
    expect(r.valid).toBe(true);
    expect(r.value).toBe('');
  });

  it('handles undefined input', () => {
    const r = validateString(undefined as unknown as string, { allowEmpty: true });
    expect(r.valid).toBe(true);
    expect(r.value).toBe('');
  });

  it('coerces numbers to strings', () => {
    const r = validateString(123 as unknown as string);
    expect(r.valid).toBe(true);
    expect(r.value).toBe('123');
  });
});

// ---------------------------------------------------------------------------
// validateCourseName
// ---------------------------------------------------------------------------
describe('validateCourseName', () => {
  it('validates a normal course name', () => {
    const r = validateCourseName('Introduction to Programming');
    expect(r.valid).toBe(true);
    expect(r.value).toBe('Introduction to Programming');
  });

  it('rejects empty course name', () => {
    const r = validateCourseName('');
    expect(r.valid).toBe(false);
  });

  it('rejects course name exceeding 100 characters', () => {
    const r = validateCourseName('A'.repeat(101));
    expect(r.valid).toBe(false);
  });

  it('passes course name at exactly 100 characters', () => {
    const r = validateCourseName('A'.repeat(100));
    expect(r.valid).toBe(true);
  });

  it('handles null input', () => {
    const r = validateCourseName(null as unknown as string);
    expect(r.valid).toBe(false);
  });

  it('trims whitespace and validates', () => {
    const r = validateCourseName('  Valid Name  ');
    expect(r.valid).toBe(true);
    expect(r.value).toBe('Valid Name');
  });
});

// ---------------------------------------------------------------------------
// validateHomeworkTitle
// ---------------------------------------------------------------------------
describe('validateHomeworkTitle', () => {
  it('validates a normal title', () => {
    const r = validateHomeworkTitle('Homework 1 - Chapter 3');
    expect(r.valid).toBe(true);
  });

  it('rejects empty title', () => {
    const r = validateHomeworkTitle('');
    expect(r.valid).toBe(false);
  });

  it('rejects title exceeding 200 characters', () => {
    const r = validateHomeworkTitle('X'.repeat(201));
    expect(r.valid).toBe(false);
  });

  it('passes title at exactly 200 characters', () => {
    const r = validateHomeworkTitle('X'.repeat(200));
    expect(r.valid).toBe(true);
  });

  it('handles null input', () => {
    const r = validateHomeworkTitle(null as unknown as string);
    expect(r.valid).toBe(false);
  });

  it('handles undefined input', () => {
    const r = validateHomeworkTitle(undefined as unknown as string);
    expect(r.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateUrl
// ---------------------------------------------------------------------------
describe('validateUrl', () => {
  it('validates a valid https URL', () => {
    const r = validateUrl('https://example.com/path?q=1');
    expect(r.valid).toBe(true);
  });

  it('validates a valid http URL', () => {
    const r = validateUrl('http://example.com');
    expect(r.valid).toBe(true);
  });

  it('rejects an invalid URL format', () => {
    const r = validateUrl('not-a-url');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('URL');
  });

  it('rejects FTP protocol by default', () => {
    const r = validateUrl('ftp://example.com');
    expect(r.valid).toBe(false);
  });

  it('allows empty URL when not required', () => {
    const r = validateUrl('', { required: false });
    expect(r.valid).toBe(true);
  });

  it('rejects empty URL when required', () => {
    const r = validateUrl('', { required: true });
    expect(r.valid).toBe(false);
  });

  it('handles null input', () => {
    const r = validateUrl(null as unknown as string, { required: false });
    expect(r.valid).toBe(true);
  });

  it('rejects URL exceeding max length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2048);
    const r = validateUrl(longUrl);
    expect(r.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateVideoUrl
// ---------------------------------------------------------------------------
describe('validateVideoUrl', () => {
  it('detects YouTube URL', () => {
    const r = validateVideoUrl('https://www.youtube.com/watch?v=abc123');
    expect(r.valid).toBe(true);
    expect(r.platform).toBe('youtube');
  });

  it('detects YouTube short URL', () => {
    const r = validateVideoUrl('https://youtu.be/abc123');
    expect(r.valid).toBe(true);
    expect(r.platform).toBe('youtube');
  });

  it('detects Panopto URL', () => {
    const r = validateVideoUrl('https://technion.panopto.com/viewer?id=123');
    expect(r.valid).toBe(true);
    expect(r.platform).toBe('panopto');
  });

  it('marks non-video URLs as "other"', () => {
    const r = validateVideoUrl('https://vimeo.com/123');
    expect(r.valid).toBe(true);
    expect(r.platform).toBe('other');
  });

  it('returns unknown platform for empty URL', () => {
    const r = validateVideoUrl('');
    expect(r.valid).toBe(true);
    expect(r.platform).toBe('unknown');
  });

  it('handles null input', () => {
    const r = validateVideoUrl(null as unknown as string);
    expect(r.valid).toBe(true);
    expect(r.platform).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// validateNumber
// ---------------------------------------------------------------------------
describe('validateNumber', () => {
  it('validates an integer', () => {
    const r = validateNumber(42, { integer: true });
    expect(r.valid).toBe(true);
    expect(r.value).toBe(42);
  });

  it('rejects non-integer when integer required', () => {
    const r = validateNumber(3.14, { integer: true });
    expect(r.valid).toBe(false);
  });

  it('validates within range', () => {
    const r = validateNumber(50, { min: 0, max: 100 });
    expect(r.valid).toBe(true);
  });

  it('rejects below minimum', () => {
    const r = validateNumber(-5, { min: 0 });
    expect(r.valid).toBe(false);
  });

  it('rejects above maximum', () => {
    const r = validateNumber(150, { max: 100 });
    expect(r.valid).toBe(false);
  });

  it('allows empty optional number', () => {
    const r = validateNumber('' as unknown as number, { required: false });
    expect(r.valid).toBe(true);
    expect(r.value).toBeNull();
  });

  it('rejects NaN', () => {
    const r = validateNumber('not a number' as unknown as number);
    expect(r.valid).toBe(false);
  });

  it('rejects zero when not allowed', () => {
    const r = validateNumber(0, { allowZero: false });
    expect(r.valid).toBe(false);
  });

  it('allows zero by default', () => {
    const r = validateNumber(0);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(0);
  });

  it('validates boundary values (min and max inclusive)', () => {
    expect(validateNumber(0, { min: 0, max: 100 }).valid).toBe(true);
    expect(validateNumber(100, { min: 0, max: 100 }).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateDate
// ---------------------------------------------------------------------------
describe('validateDate', () => {
  it('validates correct YYYY-MM-DD format', () => {
    const r = validateDate('2024-01-15');
    expect(r.valid).toBe(true);
    expect(r.date).toBeInstanceOf(Date);
  });

  it('rejects DD-MM-YYYY format', () => {
    const r = validateDate('15-01-2024');
    expect(r.valid).toBe(false);
  });

  it('rejects invalid calendar date', () => {
    const r = validateDate('2024-13-45');
    expect(r.valid).toBe(false);
  });

  it('allows empty optional date', () => {
    const r = validateDate('', { required: false });
    expect(r.valid).toBe(true);
    expect(r.date).toBeNull();
  });

  it('rejects empty required date', () => {
    const r = validateDate('', { required: true });
    expect(r.valid).toBe(false);
  });

  it('handles null input', () => {
    const r = validateDate(null as unknown as string, { required: false });
    expect(r.valid).toBe(true);
  });

  it('validates February boundary (leap year)', () => {
    expect(validateDate('2024-02-29').valid).toBe(true);
  });

  it('rejects invalid February date (non-leap year)', () => {
    expect(validateDate('2023-02-29').valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateTime
// ---------------------------------------------------------------------------
describe('validateTime', () => {
  it('validates standard HH:MM format', () => {
    const r = validateTime('14:30');
    expect(r.valid).toBe(true);
  });

  it('validates single-digit hour', () => {
    const r = validateTime('9:30');
    expect(r.valid).toBe(true);
  });

  it('validates midnight (00:00)', () => {
    expect(validateTime('00:00').valid).toBe(true);
  });

  it('validates end of day (23:59)', () => {
    expect(validateTime('23:59').valid).toBe(true);
  });

  it('rejects hour 25', () => {
    expect(validateTime('25:00').valid).toBe(false);
  });

  it('rejects minutes 60', () => {
    expect(validateTime('12:60').valid).toBe(false);
  });

  it('rejects non-time string', () => {
    expect(validateTime('noon').valid).toBe(false);
  });

  it('allows empty optional time', () => {
    const r = validateTime('', { required: false });
    expect(r.valid).toBe(true);
  });

  it('rejects empty required time', () => {
    const r = validateTime('', { required: true });
    expect(r.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateImportedData
// ---------------------------------------------------------------------------
describe('validateImportedData', () => {
  it('validates a correct data structure', () => {
    const data = {
      semesters: [{ id: '1', name: 'Fall 2024', courses: [] }],
    };
    const r = validateImportedData(data);
    expect(r.valid).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it('rejects non-object input', () => {
    const r = validateImportedData('not an object');
    expect(r.valid).toBe(false);
  });

  it('rejects null', () => {
    const r = validateImportedData(null);
    expect(r.valid).toBe(false);
  });

  it('rejects missing semesters array', () => {
    const r = validateImportedData({ foo: 'bar' });
    expect(r.valid).toBe(false);
  });

  it('handles wrapped export format', () => {
    const data = {
      data: { semesters: [{ id: '1', name: 'Test' }] },
    };
    const r = validateImportedData(data);
    expect(r.valid).toBe(true);
  });

  it('warns on missing semester id/name', () => {
    const data = { semesters: [{}] };
    const r = validateImportedData(data);
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('rejects semesters that is not an array', () => {
    const r = validateImportedData({ semesters: 'not-array' });
    expect(r.valid).toBe(false);
  });

  it('accepts empty semesters array', () => {
    const r = validateImportedData({ semesters: [] });
    expect(r.valid).toBe(true);
  });
});
