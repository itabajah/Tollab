/**
 * Theme-related constants for color theming and course colors.
 */

import { ColorTheme, ThemeMode } from '@/types';
import type { AppSettings } from '@/types';

/** Map of color theme enum values (mirrors legacy COLOR_THEMES). */
export const COLOR_THEMES = Object.freeze({
  COLORFUL: ColorTheme.Colorful,
  SINGLE: ColorTheme.Single,
  MONO: ColorTheme.Mono,
} as const);

/** Default application settings applied on first load. */
export const DEFAULT_THEME_SETTINGS: Readonly<AppSettings> = Object.freeze({
  theme: ThemeMode.Light,
  showCompleted: true,
  showWatchedRecordings: false,
  colorTheme: ColorTheme.Colorful,
  baseColorHue: 200,
});

/**
 * Golden angle in degrees for generating visually distinct sequential colors.
 * Used by the colorful theme to distribute course hues evenly.
 */
export const GOLDEN_ANGLE = 137 as const;
