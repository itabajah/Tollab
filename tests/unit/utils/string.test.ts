import { describe, it, expect } from 'vitest';
import { truncate, generateId } from '@/utils/string';

describe('truncate', () => {
  it('does not truncate when string is shorter than max', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('truncates and appends ellipsis when string exceeds max', () => {
    // truncate uses substring(0, maxLength - 1) + '…'
    expect(truncate('Hello World', 5)).toBe('Hell\u2026');
  });

  it('handles exact-length string without truncation', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('returns empty string for empty input', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('handles maxLength of 0', () => {
    // substring(0, -1) returns '' then appends ellipsis
    const result = truncate('Hello', 0);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('returns input unchanged when null/undefined', () => {
    expect(truncate(null as unknown as string, 5)).toBeFalsy();
    expect(truncate(undefined as unknown as string, 5)).toBeFalsy();
  });

  it('handles single character with maxLength 1', () => {
    expect(truncate('A', 1)).toBe('A');
  });

  it('truncates multi-byte characters correctly', () => {
    const result = truncate('שלום עולם', 4);
    expect(result.length).toBeLessThanOrEqual(6); // 4 chars + ellipsis
  });
});

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('generates non-empty IDs', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('generates unique IDs across multiple calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });

  it('contains a timestamp-like prefix', () => {
    const id = generateId();
    // The ID should start with digits (timestamp)
    expect(id).toMatch(/^\d+/);
  });
});
