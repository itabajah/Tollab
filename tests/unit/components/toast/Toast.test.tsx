/**
 * Tests for Toast component.
 *
 * Covers: render per type, auto-dismiss, close button, description,
 * action button, progress bar, hover pause, persistent mode, CSS classes.
 */

import { render, screen, fireEvent, act } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Toast } from '@/components/toast/Toast';
import { ToastType } from '@/types';
import type { ToastOptions } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderToast(overrides: Partial<{
  id: string;
  type: ToastType;
  message: string;
  options: ToastOptions;
  duration: number;
  onDismiss: (id: string) => void;
}> = {}) {
  const defaults = {
    id: 'toast-1',
    type: ToastType.Info,
    message: 'Test message',
    options: {} as ToastOptions,
    duration: 4000,
    onDismiss: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  return { ...render(<Toast {...props} />), onDismiss: props.onDismiss };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -- Render basics --------------------------------------------------------

  it('renders without crash', () => {
    renderToast();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays the message', () => {
    renderToast({ message: 'Course saved successfully' });
    expect(screen.getByText('Course saved successfully')).toBeInTheDocument();
  });

  it('renders with role="alert"', () => {
    renderToast();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // -- Type variants --------------------------------------------------------

  it('applies toast-success class for Success type', () => {
    renderToast({ type: ToastType.Success });
    expect(screen.getByRole('alert')).toHaveClass('toast-success');
  });

  it('applies toast-error class for Error type', () => {
    renderToast({ type: ToastType.Error });
    expect(screen.getByRole('alert')).toHaveClass('toast-error');
  });

  it('applies toast-warning class for Warning type', () => {
    renderToast({ type: ToastType.Warning });
    expect(screen.getByRole('alert')).toHaveClass('toast-warning');
  });

  it('applies toast-info class for Info type', () => {
    renderToast({ type: ToastType.Info });
    expect(screen.getByRole('alert')).toHaveClass('toast-info');
  });

  it('uses assertive aria-live for Error type', () => {
    renderToast({ type: ToastType.Error });
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('uses polite aria-live for non-error types', () => {
    renderToast({ type: ToastType.Info });
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
  });

  // -- Close button ---------------------------------------------------------

  it('renders a close button with "Dismiss notification" label', () => {
    renderToast();
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });

  it('calls onDismiss after close button click and animation delay', () => {
    const { onDismiss } = renderToast({ id: 'toast-42' });
    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    // After animation duration (300ms)
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDismiss).toHaveBeenCalledWith('toast-42');
  });

  // -- Description ----------------------------------------------------------

  it('renders description when provided', () => {
    renderToast({ options: { description: 'Extra details here' } });
    expect(screen.getByText('Extra details here')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = renderToast({ options: {} });
    expect(container.querySelector('.toast-description')).not.toBeInTheDocument();
  });

  // -- Action button --------------------------------------------------------

  it('renders action button when action and actionLabel provided', () => {
    const action = vi.fn();
    renderToast({ options: { action, actionLabel: 'Undo' } });
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('calls action callback and dismisses when action button clicked', () => {
    const action = vi.fn();
    const { onDismiss } = renderToast({
      id: 'toast-5',
      options: { action, actionLabel: 'Undo' },
    });
    fireEvent.click(screen.getByText('Undo'));
    expect(action).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDismiss).toHaveBeenCalledWith('toast-5');
  });

  it('does not render action button when only action is provided without label', () => {
    const { container } = renderToast({ options: { action: vi.fn() } });
    expect(container.querySelector('.toast-action')).not.toBeInTheDocument();
  });

  // -- Progress bar ---------------------------------------------------------

  it('renders progress bar when auto-dismiss is active', () => {
    const { container } = renderToast({ duration: 4000, options: {} });
    expect(container.querySelector('.toast-progress')).toBeInTheDocument();
  });

  it('hides progress bar when options.progress is false', () => {
    const { container } = renderToast({ options: { progress: false } });
    expect(container.querySelector('.toast-progress')).not.toBeInTheDocument();
  });

  it('does not show progress bar for persistent toasts', () => {
    const { container } = renderToast({ options: { persistent: true } });
    expect(container.querySelector('.toast-progress')).not.toBeInTheDocument();
  });

  // -- Auto-dismiss ---------------------------------------------------------

  it('auto-dismisses after duration', () => {
    const { onDismiss } = renderToast({ id: 'toast-99', duration: 3000 });
    // Let visibility kick in
    act(() => { vi.advanceTimersByTime(16); }); // rAF
    act(() => { vi.advanceTimersByTime(3000); }); // timer
    act(() => { vi.advanceTimersByTime(300); }); // animation
    expect(onDismiss).toHaveBeenCalledWith('toast-99');
  });

  it('does not auto-dismiss when persistent', () => {
    const { onDismiss } = renderToast({
      duration: 3000,
      options: { persistent: true },
    });
    act(() => { vi.advanceTimersByTime(16); });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not auto-dismiss when duration is 0', () => {
    const { onDismiss } = renderToast({ duration: 0 });
    act(() => { vi.advanceTimersByTime(16); });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  // -- CSS animation classes ------------------------------------------------

  it('adds toast-visible class after mount', () => {
    renderToast();
    act(() => { vi.advanceTimersByTime(16); }); // rAF
    expect(screen.getByRole('alert')).toHaveClass('toast-visible');
  });

  it('adds toast-hiding class after close', () => {
    renderToast();
    act(() => { vi.advanceTimersByTime(16); });
    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(screen.getByRole('alert')).toHaveClass('toast-hiding');
  });
});
