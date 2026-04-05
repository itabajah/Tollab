/**
 * Tests for AppearanceTab component.
 *
 * Covers: theme selection rendering, hue slider visibility,
 * reset button, apply/cancel workflow, unsaved indicator.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ColorTheme } from '@/types';

// ---------------------------------------------------------------------------
// Mock useTheme hook
// ---------------------------------------------------------------------------

const mockSetColorTheme = vi.fn();
const mockSetBaseHue = vi.fn();
const mockResetColors = vi.fn();

let mockColorTheme: ColorTheme = ColorTheme.Colorful;
let mockBaseColorHue = 200;

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    colorTheme: mockColorTheme,
    baseColorHue: mockBaseColorHue,
    setColorTheme: mockSetColorTheme,
    setBaseHue: mockSetBaseHue,
    resetColors: mockResetColors,
  }),
}));

const { AppearanceTab } = await import('@/components/settings/AppearanceTab');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppearanceTab', () => {
  beforeEach(() => {
    mockColorTheme = ColorTheme.Colorful;
    mockBaseColorHue = 200;
    vi.clearAllMocks();
  });

  // -- Render basics --------------------------------------------------------

  it('renders without crash', () => {
    const { container } = render(<AppearanceTab />);
    expect(container.querySelector('.settings-tab-content')).toBeInTheDocument();
  });

  it('displays Color Theme section title', () => {
    render(<AppearanceTab />);
    expect(screen.getByText('Color Theme')).toBeInTheDocument();
  });

  it('displays Theme Style label', () => {
    render(<AppearanceTab />);
    expect(screen.getByText('Theme Style')).toBeInTheDocument();
  });

  // -- Theme selector -------------------------------------------------------

  it('renders theme select with color theme options', () => {
    render(<AppearanceTab />);
    expect(screen.getByLabelText('Color theme')).toBeInTheDocument();
  });

  it('shows all three theme options', () => {
    render(<AppearanceTab />);
    expect(screen.getByText('Rainbow - Full color spectrum')).toBeInTheDocument();
    expect(screen.getByText('Monochromatic - Shades of one color')).toBeInTheDocument();
    expect(screen.getByText('Grayscale - No colors')).toBeInTheDocument();
  });

  // -- Hue slider visibility ------------------------------------------------

  it('does not show hue slider for Colorful theme', () => {
    mockColorTheme = ColorTheme.Colorful;
    render(<AppearanceTab />);
    expect(screen.queryByLabelText(/Base Color/)).not.toBeInTheDocument();
  });

  it('shows hue slider for Single (monochromatic) theme', () => {
    mockColorTheme = ColorTheme.Single;
    render(<AppearanceTab />);
    expect(screen.getByLabelText(/Base Color/)).toBeInTheDocument();
  });

  it('does not show hue slider for Mono theme', () => {
    mockColorTheme = ColorTheme.Mono;
    render(<AppearanceTab />);
    expect(screen.queryByLabelText(/Base Color/)).not.toBeInTheDocument();
  });

  // -- Color preview swatch -------------------------------------------------

  it('shows color preview swatch for Single theme', () => {
    mockColorTheme = ColorTheme.Single;
    const { container } = render(<AppearanceTab />);
    const swatch = container.querySelector('.color-preview-swatch') as HTMLElement;
    expect(swatch).toBeInTheDocument();
    // jsdom converts HSL to RGB, so just check backgroundColor is set
    expect(swatch.style.backgroundColor).not.toBe('');
  });

  // -- Reset Colors button --------------------------------------------------

  it('shows Reset Colors button for Colorful theme', () => {
    mockColorTheme = ColorTheme.Colorful;
    render(<AppearanceTab />);
    expect(screen.getByText('Reset Colors')).toBeInTheDocument();
  });

  it('shows Reset Colors button for Single theme', () => {
    mockColorTheme = ColorTheme.Single;
    render(<AppearanceTab />);
    expect(screen.getByText('Reset Colors')).toBeInTheDocument();
  });

  it('does not show Reset Colors button for Mono theme', () => {
    mockColorTheme = ColorTheme.Mono;
    render(<AppearanceTab />);
    expect(screen.queryByText('Reset Colors')).not.toBeInTheDocument();
  });

  it('calls resetColors when Reset Colors clicked', () => {
    mockColorTheme = ColorTheme.Colorful;
    render(<AppearanceTab />);
    fireEvent.click(screen.getByText('Reset Colors'));
    expect(mockResetColors).toHaveBeenCalledTimes(1);
  });

  // -- Unsaved changes indicator --------------------------------------------

  it('does not show unsaved indicator initially', () => {
    render(<AppearanceTab />);
    expect(screen.queryByText('(unsaved changes)')).not.toBeInTheDocument();
  });

  it('shows unsaved indicator after changing theme selection', () => {
    render(<AppearanceTab />);
    const select = screen.getByLabelText('Color theme');
    fireEvent.change(select, { target: { value: ColorTheme.Mono } });
    expect(screen.getByText('(unsaved changes)')).toBeInTheDocument();
  });

  // -- Apply / Cancel -------------------------------------------------------

  it('shows Apply and Cancel buttons when there are unsaved changes', () => {
    render(<AppearanceTab />);
    const select = screen.getByLabelText('Color theme');
    fireEvent.change(select, { target: { value: ColorTheme.Single } });
    expect(screen.getByText('Apply')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not show Apply/Cancel when no changes', () => {
    render(<AppearanceTab />);
    expect(screen.queryByText('Apply')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('calls setColorTheme on Apply when theme changed', () => {
    render(<AppearanceTab />);
    const select = screen.getByLabelText('Color theme');
    fireEvent.change(select, { target: { value: ColorTheme.Mono } });
    fireEvent.click(screen.getByText('Apply'));
    expect(mockSetColorTheme).toHaveBeenCalledWith(ColorTheme.Mono);
  });

  it('clears unsaved state on Cancel', () => {
    render(<AppearanceTab />);
    const select = screen.getByLabelText('Color theme');
    fireEvent.change(select, { target: { value: ColorTheme.Single } });
    expect(screen.getByText('(unsaved changes)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('(unsaved changes)')).not.toBeInTheDocument();
  });
});
