import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateCourseName,
  validateHomeworkTitle,
  validateProfileName,
  validateNotes,
  validateUrl,
  validateVideoUrl,
  validateNumber,
  validateCoursePoints,
  validateGrade,
  validateCalendarHour,
  validateDate,
  validateTime,
  validateImportedData,
  validateScheduleItem,
  sanitizeString,
  sanitizeFilename,
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

// ---------------------------------------------------------------------------
// validateProfileName
// ---------------------------------------------------------------------------
describe('validateProfileName', () => {
  it('validates a normal profile name', () => {
    const r = validateProfileName('My Profile');
    expect(r.valid).toBe(true);
    expect(r.value).toBe('My Profile');
  });

  it('rejects empty name (required)', () => {
    const r = validateProfileName('');
    expect(r.valid).toBe(false);
  });

  it('rejects name exceeding 50 characters', () => {
    const r = validateProfileName('A'.repeat(51));
    expect(r.valid).toBe(false);
  });

  it('passes name at exactly 50 characters', () => {
    const r = validateProfileName('A'.repeat(50));
    expect(r.valid).toBe(true);
  });

  it('trims whitespace and validates', () => {
    const r = validateProfileName('  Profile One  ');
    expect(r.valid).toBe(true);
    expect(r.value).toBe('Profile One');
  });

  it('handles null input', () => {
    const r = validateProfileName(null as unknown as string);
    expect(r.valid).toBe(false);
  });

  it('handles undefined input', () => {
    const r = validateProfileName(undefined as unknown as string);
    expect(r.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateNotes
// ---------------------------------------------------------------------------
describe('validateNotes', () => {
  it('allows empty notes', () => {
    const r = validateNotes('');
    expect(r.valid).toBe(true);
  });

  it('validates normal notes text', () => {
    const r = validateNotes('Some notes about the course');
    expect(r.valid).toBe(true);
    expect(r.value).toBe('Some notes about the course');
  });

  it('rejects notes exceeding 5000 characters', () => {
    const r = validateNotes('x'.repeat(5001));
    expect(r.valid).toBe(false);
  });

  it('passes notes at exactly 5000 characters', () => {
    const r = validateNotes('x'.repeat(5000));
    expect(r.valid).toBe(true);
  });

  it('handles null input', () => {
    const r = validateNotes(null as unknown as string);
    expect(r.valid).toBe(true);
    expect(r.value).toBe('');
  });

  it('handles undefined input', () => {
    const r = validateNotes(undefined as unknown as string);
    expect(r.valid).toBe(true);
    expect(r.value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// validateCoursePoints
// ---------------------------------------------------------------------------
describe('validateCoursePoints', () => {
  it('validates a valid float', () => {
    const r = validateCoursePoints(3.5);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(3.5);
  });

  it('allows 0 (boundary)', () => {
    const r = validateCoursePoints(0);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(0);
  });

  it('allows 100 (boundary)', () => {
    const r = validateCoursePoints(100);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(100);
  });

  it('rejects above 100', () => {
    const r = validateCoursePoints(101);
    expect(r.valid).toBe(false);
  });

  it('rejects negative values', () => {
    const r = validateCoursePoints(-1);
    expect(r.valid).toBe(false);
  });

  it('allows empty (not required)', () => {
    const r = validateCoursePoints('' as unknown as number);
    expect(r.valid).toBe(true);
    expect(r.value).toBeNull();
  });

  it('handles null input', () => {
    const r = validateCoursePoints(null as unknown as number);
    expect(r.valid).toBe(true);
    expect(r.value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateGrade
// ---------------------------------------------------------------------------
describe('validateGrade', () => {
  it('validates a valid integer grade', () => {
    const r = validateGrade(85);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(85);
  });

  it('rejects a float grade', () => {
    const r = validateGrade(85.5);
    expect(r.valid).toBe(false);
  });

  it('allows 0 (boundary)', () => {
    const r = validateGrade(0);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(0);
  });

  it('allows 100 (boundary)', () => {
    const r = validateGrade(100);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(100);
  });

  it('rejects above 100', () => {
    const r = validateGrade(101);
    expect(r.valid).toBe(false);
  });

  it('rejects negative values', () => {
    const r = validateGrade(-1);
    expect(r.valid).toBe(false);
  });

  it('allows empty (not required)', () => {
    const r = validateGrade('' as unknown as number);
    expect(r.valid).toBe(true);
    expect(r.value).toBeNull();
  });

  it('handles null input', () => {
    const r = validateGrade(null as unknown as number);
    expect(r.valid).toBe(true);
    expect(r.value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateCalendarHour
// ---------------------------------------------------------------------------
describe('validateCalendarHour', () => {
  it('validates hour 0 (midnight)', () => {
    const r = validateCalendarHour(0);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(0);
  });

  it('validates hour 23', () => {
    const r = validateCalendarHour(23);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(23);
  });

  it('validates a mid-range hour', () => {
    const r = validateCalendarHour(12);
    expect(r.valid).toBe(true);
    expect(r.value).toBe(12);
  });

  it('rejects hour 24 (out of range)', () => {
    const r = validateCalendarHour(24);
    expect(r.valid).toBe(false);
  });

  it('rejects negative hour', () => {
    const r = validateCalendarHour(-1);
    expect(r.valid).toBe(false);
  });

  it('rejects non-integer', () => {
    const r = validateCalendarHour(8.5);
    expect(r.valid).toBe(false);
  });

  it('rejects empty (required field)', () => {
    const r = validateCalendarHour('' as unknown as number);
    expect(r.valid).toBe(false);
  });

  it('rejects null (required field)', () => {
    const r = validateCalendarHour(null as unknown as number);
    expect(r.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateScheduleItem
// ---------------------------------------------------------------------------
describe('validateScheduleItem', () => {
  it('validates a correct schedule item', () => {
    const r = validateScheduleItem({ day: 1, start: '08:00', end: '10:00' });
    expect(r.valid).toBe(true);
    expect(r.value).toEqual({ day: 1, start: '08:00', end: '10:00' });
  });

  it('rejects null input', () => {
    const r = validateScheduleItem(null);
    expect(r.valid).toBe(false);
    expect(r.error).toContain('Invalid schedule item');
  });

  it('rejects non-object input', () => {
    const r = validateScheduleItem('not-an-object');
    expect(r.valid).toBe(false);
  });

  it('rejects invalid day (7)', () => {
    const r = validateScheduleItem({ day: 7, start: '08:00', end: '10:00' });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('day');
  });

  it('rejects negative day', () => {
    const r = validateScheduleItem({ day: -1, start: '08:00', end: '10:00' });
    expect(r.valid).toBe(false);
  });

  it('rejects end time before start time', () => {
    const r = validateScheduleItem({ day: 0, start: '14:00', end: '10:00' });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('End time must be after start time');
  });

  it('rejects equal start and end time', () => {
    const r = validateScheduleItem({ day: 0, start: '10:00', end: '10:00' });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('End time must be after start time');
  });

  it('rejects invalid time format', () => {
    const r = validateScheduleItem({ day: 0, start: 'abc', end: '10:00' });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('start time');
  });

  it('rejects missing start time', () => {
    const r = validateScheduleItem({ day: 0, end: '10:00' });
    expect(r.valid).toBe(false);
  });

  it('rejects missing end time', () => {
    const r = validateScheduleItem({ day: 0, start: '08:00' });
    expect(r.valid).toBe(false);
  });

  it('rejects missing day', () => {
    const r = validateScheduleItem({ start: '08:00', end: '10:00' });
    expect(r.valid).toBe(false);
  });

  it('validates day 0 (Sunday) and day 6 (Saturday)', () => {
    expect(validateScheduleItem({ day: 0, start: '08:00', end: '09:00' }).valid).toBe(true);
    expect(validateScheduleItem({ day: 6, start: '08:00', end: '09:00' }).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sanitizeString
// ---------------------------------------------------------------------------
describe('sanitizeString', () => {
  it('returns empty string for null', () => {
    expect(sanitizeString(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(sanitizeString(undefined)).toBe('');
  });

  it('strips control characters', () => {
    // Control chars are removed, not replaced with spaces
    expect(sanitizeString('hello\x00world\x07test')).toBe('helloworldtest');
  });

  it('preserves normal text unchanged', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World');
  });

  it('collapses multiple spaces to single space', () => {
    expect(sanitizeString('hello    world')).toBe('hello world');
  });

  it('collapses 3+ newlines to double newline', () => {
    expect(sanitizeString('line1\n\n\n\nline2')).toBe('line1\n\nline2');
  });

  it('preserves double newlines', () => {
    expect(sanitizeString('line1\n\nline2')).toBe('line1\n\nline2');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('coerces numbers to string', () => {
    expect(sanitizeString(42)).toBe('42');
  });

  it('strips mixed control characters and normalizes whitespace', () => {
    expect(sanitizeString('\x01hello\x02   \x03world\x04')).toBe('hello world');
  });

  it('does not strip normal tabs and newlines used in content', () => {
    // Tab (\x09) and newline (\x0A) and carriage return (\x0D) are NOT in the stripped range
    expect(sanitizeString('hello\tworld')).toBe('hello\tworld');
  });

  it('handles script tag content as plain text (no HTML parsing)', () => {
    const result = sanitizeString('<script>alert("xss")</script>');
    expect(result).toBe('<script>alert("xss")</script>');
  });

  it('handles HTML entities as plain text', () => {
    expect(sanitizeString('&amp; &lt; &gt;')).toBe('&amp; &lt; &gt;');
  });
});

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------
describe('sanitizeFilename', () => {
  it('returns "export" for null', () => {
    expect(sanitizeFilename(null)).toBe('export');
  });

  it('returns "export" for undefined', () => {
    expect(sanitizeFilename(undefined)).toBe('export');
  });

  it('returns "export" for empty string', () => {
    expect(sanitizeFilename('')).toBe('export');
  });

  it('preserves a clean filename', () => {
    expect(sanitizeFilename('my-report')).toBe('my-report');
  });

  it('replaces path separator characters', () => {
    const result = sanitizeFilename('../../etc/passwd');
    // Slashes are replaced with _, dots are preserved (not in banned set)
    expect(result).not.toContain('/');
    expect(result).not.toContain('\\');
  });

  it('replaces special chars (<>:"|?*)', () => {
    expect(sanitizeFilename('file<>:"|?*.txt')).not.toMatch(/[<>:"|?*]/);
  });

  it('collapses consecutive underscores', () => {
    const result = sanitizeFilename('file:::name');
    expect(result).not.toContain('__');
  });

  it('strips leading and trailing underscores', () => {
    const result = sanitizeFilename(':filename:');
    expect(result).not.toMatch(/^_/);
    expect(result).not.toMatch(/_$/);
  });

  it('truncates at 100 characters', () => {
    const longName = 'a'.repeat(150);
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('returns "export" when sanitized result is empty', () => {
    // All chars are invalid → replaced → collapsed → stripped → empty
    expect(sanitizeFilename(':::')).toBe('export');
  });

  it('strips control characters from filename', () => {
    const result = sanitizeFilename('file\x00name\x1F.txt');
    expect(result).not.toMatch(/[\x00-\x1F]/);
  });

  it('handles filename with spaces (preserved)', () => {
    expect(sanitizeFilename('my file name')).toBe('my file name');
  });

  it('handles Windows path traversal', () => {
    const result = sanitizeFilename('..\\..\\system32\\config');
    expect(result).not.toContain('\\');
  });
});
