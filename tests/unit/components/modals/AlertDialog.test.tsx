/**
 * Tests for AlertDialog component.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/modals/useFocusTrap', () => ({
  useFocusTrap: () => ({ handleTabKey: vi.fn() }),
}));

vi.mock('@/components/icons', () => ({
  InfoIcon: (props: Record<string, unknown>) => <span data-testid="info-icon" {...props} />,
  SuccessIcon: (props: Record<string, unknown>) => <span data-testid="success-icon" {...props} />,
  WarningIcon: (props: Record<string, unknown>) => <span data-testid="warning-icon" {...props} />,
  ErrorIcon: (props: Record<string, unknown>) => <span data-testid="error-icon" {...props} />,
}));

import { AlertDialog } from '@/components/modals/AlertDialog';
import type { AlertType } from '@/components/modals/AlertDialog';

function renderAlert(overrides: Partial<{
  isOpen: boolean;
  message: string;
  description: string;
  title: string;
  confirmText: string;
  type: AlertType;
  onResolve: () => void;
}> = {}) {
  const defaults = {
    isOpen: true,
    message: 'Something happened',
    onResolve: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  return { ...render(<AlertDialog {...props} />), onResolve: props.onResolve };
}

describe('AlertDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderAlert({ isOpen: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open', () => {
    renderAlert();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('displays the message text', () => {
    renderAlert({ message: 'File saved successfully' });
    expect(screen.getByText('File saved successfully')).toBeInTheDocument();
  });

  it('displays optional description', () => {
    renderAlert({ description: 'More details here' });
    expect(screen.getByText('More details here')).toBeInTheDocument();
  });

  it('hides description when not provided', () => {
    renderAlert();
    expect(screen.queryByText(/alert-dialog-description/)).not.toBeInTheDocument();
  });

  it('uses default title "Notice"', () => {
    renderAlert();
    expect(screen.getByText('Notice')).toBeInTheDocument();
  });

  it('uses custom title', () => {
    renderAlert({ title: 'Warning!' });
    expect(screen.getByText('Warning!')).toBeInTheDocument();
  });

  it('uses default confirm text "OK"', () => {
    renderAlert();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('uses custom confirm text', () => {
    renderAlert({ confirmText: 'Got it' });
    expect(screen.getByText('Got it')).toBeInTheDocument();
  });

  it('renders info icon by default', () => {
    renderAlert();
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });

  it('renders success icon for success type', () => {
    renderAlert({ type: 'success' });
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
  });

  it('renders warning icon for warning type', () => {
    renderAlert({ type: 'warning' });
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
  });

  it('renders error icon for error type', () => {
    renderAlert({ type: 'error' });
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });

  it('calls onResolve when OK button clicked', () => {
    const { onResolve } = renderAlert();
    fireEvent.click(screen.getByText('OK'));
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('calls onResolve on Escape key', () => {
    const { onResolve } = renderAlert();
    fireEvent.keyDown(screen.getByRole('alertdialog').parentElement!, { key: 'Escape' });
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('calls onResolve on Enter key', () => {
    const { onResolve } = renderAlert();
    fireEvent.keyDown(screen.getByRole('alertdialog').parentElement!, { key: 'Enter' });
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('calls onResolve on overlay click', () => {
    const { onResolve } = renderAlert();
    const overlay = screen.getByRole('alertdialog').parentElement!;
    // Simulate clicking the overlay itself (not the modal)
    fireEvent.click(overlay, { target: overlay });
    expect(onResolve).toHaveBeenCalled();
  });

  it('does not call onResolve when clicking inside modal', () => {
    const { onResolve } = renderAlert();
    fireEvent.click(screen.getByRole('alertdialog'));
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('applies correct CSS class for alert type', () => {
    renderAlert({ type: 'error' });
    expect(screen.getByRole('alertdialog')).toHaveClass('alert-dialog-error');
  });

  it('has aria-modal attribute', () => {
    renderAlert();
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-label with title', () => {
    renderAlert({ title: 'Custom Title' });
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-label', 'Custom Title');
  });
});
