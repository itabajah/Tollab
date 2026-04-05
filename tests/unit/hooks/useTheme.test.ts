/**
 * Tests for useTheme hook — theme management with dark mode, color themes,
 * and localStorage persistence.
 *
 * Mocks the Zustand app-store to test the hook's pure logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { ColorTheme, ThemeMode } from '@/types';

// ---------------------------------------------------------------------------
// Mock store
// ---------------------------------------------------------------------------

let mockSettings = {
  theme: ThemeMode.Light as ThemeMode | string,
  showCompleted: true,
  showWatchedRecordings: true,
  colorTheme: ColorTheme.Colorful as ColorTheme | string,
  baseColorHue: 200,
};

const mockUpdateSettings = vi.fn((patch: Record<string, unknown>) => {
  mockSettings = { ...mockSettings, ...patch };
});

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => {
    const state = {
      settings: mockSettings,
      updateSettings: mockUpdateSettings,
    };
    return selector(state);
  },
}));

// ---------------------------------------------------------------------------
// Import after mock
// ---------------------------------------------------------------------------

import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {
      theme: ThemeMode.Light,
      showCompleted: true,
      showWatchedRecordings: true,
      colorTheme: ColorTheme.Colorful,
      baseColorHue: 200,
    };
    document.body.classList.remove('dark-mode');
    localStorage.clear();
  });

  // =========================================================================
  // Initial state
  // =========================================================================

  describe('initial state', () => {
    it('returns isDark=false for light theme', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(false);
    });

    it('returns isDark=true for dark theme', () => {
      mockSettings.theme = ThemeMode.Dark;
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(true);
    });

    it('returns isDark=true for string "dark"', () => {
      mockSettings.theme = 'dark';
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(true);
    });

    it('exposes current theme settings', () => {
      mockSettings.colorTheme = ColorTheme.Mono;
      mockSettings.baseColorHue = 120;
      const { result } = renderHook(() => useTheme());

      expect(result.current.colorTheme).toBe(ColorTheme.Mono);
      expect(result.current.baseColorHue).toBe(120);
    });
  });

  // =========================================================================
  // Dark mode CSS class
  // =========================================================================

  describe('dark mode CSS class', () => {
    it('adds dark-mode class to body when dark', () => {
      mockSettings.theme = ThemeMode.Dark;
      renderHook(() => useTheme());

      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });

    it('removes dark-mode class when light', () => {
      document.body.classList.add('dark-mode');
      mockSettings.theme = ThemeMode.Light;
      renderHook(() => useTheme());

      expect(document.body.classList.contains('dark-mode')).toBe(false);
    });
  });

  // =========================================================================
  // localStorage persistence
  // =========================================================================

  describe('localStorage persistence', () => {
    it('saves "dark" to localStorage when in dark mode', () => {
      mockSettings.theme = ThemeMode.Dark;
      renderHook(() => useTheme());

      expect(localStorage.getItem('tollab_theme_mode')).toBe('dark');
    });

    it('saves "light" to localStorage when in light mode', () => {
      mockSettings.theme = ThemeMode.Light;
      renderHook(() => useTheme());

      expect(localStorage.getItem('tollab_theme_mode')).toBe('light');
    });
  });

  // =========================================================================
  // toggleDarkMode
  // =========================================================================

  describe('toggleDarkMode', () => {
    it('switches from light to dark', () => {
      mockSettings.theme = ThemeMode.Light;
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleDarkMode();
      });

      expect(mockUpdateSettings).toHaveBeenCalledWith({
        theme: ThemeMode.Dark,
      });
    });

    it('switches from dark to light', () => {
      mockSettings.theme = ThemeMode.Dark;
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleDarkMode();
      });

      expect(mockUpdateSettings).toHaveBeenCalledWith({
        theme: ThemeMode.Light,
      });
    });
  });

  // =========================================================================
  // setColorTheme
  // =========================================================================

  describe('setColorTheme', () => {
    it('calls updateSettings with color theme', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setColorTheme(ColorTheme.Mono);
      });

      expect(mockUpdateSettings).toHaveBeenCalledWith({
        colorTheme: ColorTheme.Mono,
      });
    });

    it('handles all color theme values', () => {
      const { result } = renderHook(() => useTheme());

      for (const theme of [ColorTheme.Colorful, ColorTheme.Single, ColorTheme.Mono]) {
        act(() => {
          result.current.setColorTheme(theme);
        });
        expect(mockUpdateSettings).toHaveBeenCalledWith({ colorTheme: theme });
      }
    });
  });

  // =========================================================================
  // setBaseHue
  // =========================================================================

  describe('setBaseHue', () => {
    it('calls updateSettings with new hue', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setBaseHue(300);
      });

      expect(mockUpdateSettings).toHaveBeenCalledWith({
        baseColorHue: 300,
      });
    });

    it('handles edge values 0 and 360', () => {
      const { result } = renderHook(() => useTheme());

      act(() => { result.current.setBaseHue(0); });
      expect(mockUpdateSettings).toHaveBeenCalledWith({ baseColorHue: 0 });

      act(() => { result.current.setBaseHue(360); });
      expect(mockUpdateSettings).toHaveBeenCalledWith({ baseColorHue: 360 });
    });
  });

  // =========================================================================
  // resetColors
  // =========================================================================

  describe('resetColors', () => {
    it('resets to Colorful theme with hue 200', () => {
      mockSettings.colorTheme = ColorTheme.Mono;
      mockSettings.baseColorHue = 50;
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.resetColors();
      });

      expect(mockUpdateSettings).toHaveBeenCalledWith({
        colorTheme: ColorTheme.Colorful,
        baseColorHue: 200,
      });
    });
  });
});
