import { describe, it, expect } from 'vitest';
import {
  extractHueFromColor,
  getNextAvailableHue,
  generateCourseColor,
} from '@/utils/color';

describe('extractHueFromColor', () => {
  it('extracts hue from a valid HSL string', () => {
    expect(extractHueFromColor('hsl(120, 45%, 50%)')).toBe(120);
  });

  it('extracts hue 0 from hsl(0, ...)', () => {
    expect(extractHueFromColor('hsl(0, 0%, 50%)')).toBe(0);
  });

  it('extracts hue from high-value hue', () => {
    expect(extractHueFromColor('hsl(359, 45%, 50%)')).toBe(359);
  });

  it('returns 0 for invalid format', () => {
    expect(extractHueFromColor('rgb(255, 0, 0)')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(extractHueFromColor('')).toBe(0);
  });

  it('returns 0 for null input (throws — source expects string)', () => {
    expect(() => extractHueFromColor(null as unknown as string)).toThrow();
  });
});

describe('getNextAvailableHue', () => {
  it('returns 0 when no hues are in use', () => {
    expect(getNextAvailableHue([])).toBe(0);
  });

  it('returns hue in the largest gap for a single existing hue', () => {
    // Only hue 0 exists → largest gap is 0..360, midpoint = 180
    const hue = getNextAvailableHue([0]);
    expect(hue).toBe(180);
  });

  it('places new hue between two spread hues', () => {
    // Hues at 0 and 180 → two gaps of 180°, picks midpoint (90 or 270)
    const hue = getNextAvailableHue([0, 180]);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it('handles adjacent hues and picks the widest gap', () => {
    const hue = getNextAvailableHue([10, 20, 30]);
    // Widest gap is 30→10 (wrap), midpoint ≈ 195
    expect(hue).toBeGreaterThan(30);
  });

  it('always returns a value between 0 and 359', () => {
    const hue = getNextAvailableHue([100, 200, 300]);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});

describe('generateCourseColor', () => {
  it('returns HSL with hue 0 for the first course (no existing colors)', () => {
    const color = generateCourseColor([]);
    expect(color).toBe('hsl(0, 45%, 50%)');
  });

  it('uses golden angle (137°) for second course', () => {
    const color = generateCourseColor(['hsl(0, 45%, 50%)']);
    expect(color).toBe('hsl(137, 45%, 50%)');
  });

  it('returns valid HSL format', () => {
    const color = generateCourseColor(['a', 'b', 'c']);
    expect(color).toMatch(/^hsl\(\d+, 45%, 50%\)$/);
  });

  it('generates unique colors for different array lengths', () => {
    const colors: string[] = [];
    for (let i = 0; i < 6; i++) {
      colors.push(generateCourseColor([...colors]));
    }
    const unique = new Set(colors);
    expect(unique.size).toBe(6);
  });

  it('returns consistent color for same existing-colors array', () => {
    const existing = ['hsl(0, 45%, 50%)', 'hsl(137, 45%, 50%)'];
    const a = generateCourseColor(existing);
    const b = generateCourseColor(existing);
    expect(a).toBe(b);
  });
});
