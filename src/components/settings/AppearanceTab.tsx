/**
 * Appearance settings tab.
 *
 * Features:
 * - Color theme selector: Rainbow / Mono / Grayscale
 * - Base hue slider with live preview (inline style for dynamic preview)
 * - Reset colors button
 * - Apply / Cancel workflow matching legacy settings modal
 */

import { useCallback, useState } from 'preact/hooks';

import { useTheme } from '@/hooks/useTheme';
import { Button, Select } from '@/components/ui';
import { ColorTheme } from '@/types';
import type { SelectOption } from '@/components/ui';
import { getInputValue } from '@/utils/dom';

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
    colorTheme,
    baseColorHue,
    setColorTheme,
    setBaseHue,
    resetColors,
  } = useTheme();

  // Pending (preview) state — only committed on Apply
  const [pendingTheme, setPendingTheme] = useState<ColorTheme | null>(null);
  const [pendingHue, setPendingHue] = useState<number | null>(null);

  const effectiveTheme = pendingTheme ?? colorTheme;
  const effectiveHue = pendingHue ?? baseColorHue;
  const hasChanges = pendingTheme !== null || pendingHue !== null;

  const handleThemeChange = useCallback((value: string) => {
    setPendingTheme(value as ColorTheme);
  }, []);

  const handleHueChange = useCallback((e: Event) => {
    const val = parseInt(getInputValue(e), 10);
    if (!isNaN(val)) {
      setPendingHue(val);
    }
  }, []);

  const handleApply = useCallback(() => {
    if (pendingTheme !== null) setColorTheme(pendingTheme);
    if (pendingHue !== null) setBaseHue(pendingHue);
    setPendingTheme(null);
    setPendingHue(null);
  }, [pendingTheme, pendingHue, setColorTheme, setBaseHue]);

  const handleCancel = useCallback(() => {
    setPendingTheme(null);
    setPendingHue(null);
  }, []);

  const handleReset = useCallback(() => {
    resetColors();
    setPendingTheme(null);
    setPendingHue(null);
  }, [resetColors]);

  const showHueSlider = effectiveTheme === ColorTheme.Single;

  return (
    <div class="settings-tab-content">
      {/* Color Theme */}
      <div class="form-group">
        <h3 class="settings-section-title">
          Color Theme
          {hasChanges && (
            <span class="settings-unsaved-indicator">(unsaved changes)</span>
          )}
        </h3>
        <label htmlFor="color-theme-select">Theme Style</label>
        <Select
          id="color-theme-select"
          options={COLOR_THEME_OPTIONS}
          value={typeof effectiveTheme === 'string' ? effectiveTheme : ColorTheme.Colorful}
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
              value={effectiveHue}
              onInput={handleHueChange}
            />
            <div
              class="color-preview-swatch"
              style={{ backgroundColor: `hsl(${effectiveHue}, 45%, 50%)` }}
              aria-label={`Color preview: hue ${effectiveHue}`}
            />
          </div>
        </div>
      )}

      {/* Theme buttons */}
      <div class="form-group">
        {effectiveTheme !== ColorTheme.Mono && (
          <Button variant="secondary" onClick={handleReset}>
            Reset Colors
          </Button>
        )}
        {hasChanges && (
          <div class="form-row settings-theme-buttons">
            <Button variant="primary" onClick={handleApply}>
              Apply
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
