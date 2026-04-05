/**
 * Appearance settings tab.
 *
 * Features:
 * - Color theme selector: Rainbow / Mono / Grayscale
 * - Base hue slider with live preview (inline style for dynamic preview)
 * - Reset colors button
 * - Dark/light mode toggle
 */

import { useCallback } from 'preact/hooks';

import { useTheme } from '@/hooks/useTheme';
import { Button, Select } from '@/components/ui';
import { ColorTheme } from '@/types';
import type { SelectOption } from '@/components/ui';

// ---------------------------------------------------------------------------
// Theme options
// ---------------------------------------------------------------------------

const COLOR_THEME_OPTIONS: readonly SelectOption[] = [
  { value: ColorTheme.Colorful, label: 'Rainbow - Full color spectrum' },
  { value: ColorTheme.Single, label: 'Monochromatic - Shades of one color' },
  { value: ColorTheme.Mono, label: 'Grayscale - No colors' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppearanceTab() {
  const {
    isDark,
    colorTheme,
    baseColorHue,
    toggleDarkMode,
    setColorTheme,
    setBaseHue,
    resetColors,
  } = useTheme();

  const handleThemeChange = useCallback(
    (value: string) => {
      const ct = value as ColorTheme;
      setColorTheme(ct);
    },
    [setColorTheme],
  );

  const handleHueChange = useCallback(
    (e: Event) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val)) {
        setBaseHue(val);
      }
    },
    [setBaseHue],
  );

  const showHueSlider = colorTheme === ColorTheme.Single || colorTheme === 'single';

  return (
    <div class="settings-tab-content">
      {/* Dark/Light Mode */}
      <div class="form-group">
        <h3 class="settings-section-title">Display Mode</h3>
        <Button variant="secondary" onClick={toggleDarkMode}>
          {isDark ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
        </Button>
      </div>

      {/* Color Theme */}
      <div class="form-group">
        <h3 class="settings-section-title">Color Theme</h3>
        <label htmlFor="color-theme-select">Theme Style</label>
        <Select
          id="color-theme-select"
          options={COLOR_THEME_OPTIONS}
          value={typeof colorTheme === 'string' ? colorTheme : ColorTheme.Colorful}
          onChange={handleThemeChange}
          aria-label="Color theme"
        />
      </div>

      {/* Base Hue Slider — only for monochromatic */}
      {showHueSlider && (
        <div class="form-group">
          <label htmlFor="base-color-hue">Base Color</label>
          <div class="color-picker-row">
            <input
              type="range"
              id="base-color-hue"
              min="1"
              max="360"
              value={baseColorHue}
              onInput={handleHueChange}
            />
            <div
              class="color-preview-swatch"
              style={{ backgroundColor: `hsl(${baseColorHue}, 45%, 50%)` }}
              aria-label={`Color preview: hue ${baseColorHue}`}
            />
          </div>
        </div>
      )}

      {/* Reset Colors */}
      {colorTheme !== ColorTheme.Mono && colorTheme !== 'mono' && (
        <div class="form-group">
          <Button variant="secondary" onClick={resetColors}>
            Reset Colors
          </Button>
        </div>
      )}
    </div>
  );
}
