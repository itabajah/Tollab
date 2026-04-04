/**
 * HSL color utilities — hue extraction, golden-angle distribution,
 * and theme-aware course color generation.
 */

/**
 * Extracts the hue value from an HSL color string (e.g. `"hsl(180, 45%, 50%)"`).
 * Returns `0` if the string cannot be parsed.
 */
export function extractHueFromColor(color: string): number {
  const match = color.match(/hsl\((\d+)/);
  return match?.[1] ? parseInt(match[1], 10) : 0;
}

/**
 * Given an array of hue values already in use, returns the next hue that
 * maximises the minimum angular distance from existing hues.
 *
 * When `usedHues` is empty the function returns `0`.
 */
export function getNextAvailableHue(usedHues: number[]): number {
  if (usedHues.length === 0) return 0;

  const sorted = [...usedHues].sort((a, b) => a - b);

  let bestHue = 0;
  let bestGap = 0;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!;
    const next = sorted[(i + 1) % sorted.length]!;
    const gap = i + 1 < sorted.length ? next - current : 360 - current + next;
    if (gap > bestGap) {
      bestGap = gap;
      bestHue = (current + gap / 2) % 360;
    }
  }

  return Math.round(bestHue);
}

/**
 * Generates an HSL color string for a new course based on the colours already
 * assigned. Uses golden-angle distribution across the hue wheel.
 *
 * @param existingColors - Array of existing HSL color strings for courses.
 * @returns An HSL color string with `45%` saturation and `50%` lightness.
 */
export function generateCourseColor(existingColors: string[]): string {
  const GOLDEN_ANGLE = 137;
  const index = existingColors.length;
  const hue = (index * GOLDEN_ANGLE) % 360;
  return `hsl(${hue}, 45%, 50%)`;
}
