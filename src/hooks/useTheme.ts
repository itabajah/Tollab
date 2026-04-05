/**
 * Theme management hook.
 *
 * Reads theme settings from app-store, applies CSS class changes for
 * dark/light mode, and persists the choice via updateSettings.
 * Color theme changes (colorful/single/mono) and base hue are also
 * managed here with immediate application (no save button).
 */

import { useCallback, useEffect } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import { ColorTheme, ThemeMode } from '@/types';

const THEME_STORAGE_KEY = 'tollab_theme_mode';

export function useTheme() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const isDark = settings.theme === ThemeMode.Dark || settings.theme === 'dark';

  // Apply dark-mode class whenever settings.theme changes
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Quota exceeded — ignore
    }
  }, [isDark]);

  const toggleDarkMode = useCallback(() => {
    const next = isDark ? ThemeMode.Light : ThemeMode.Dark;
    updateSettings({ theme: next });
  }, [isDark, updateSettings]);

  const setColorTheme = useCallback(
    (theme: ColorTheme) => {
      updateSettings({ colorTheme: theme });
    },
    [updateSettings],
  );

  const setBaseHue = useCallback(
    (hue: number) => {
      updateSettings({ baseColorHue: hue });
    },
    [updateSettings],
  );

  const resetColors = useCallback(() => {
    updateSettings({
      colorTheme: ColorTheme.Colorful,
      baseColorHue: 200,
    });
  }, [updateSettings]);

  return {
    isDark,
    theme: settings.theme,
    colorTheme: settings.colorTheme,
    baseColorHue: settings.baseColorHue,
    toggleDarkMode,
    setColorTheme,
    setBaseHue,
    resetColors,
  } as const;
}
