/**
 * Tests for ConfirmDialog component.
 *
 * Covers: render, confirm/cancel buttons, keyboard Enter/Escape,
 * backdrop click, dangerous mode, custom text, description, ARIA.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(overrides: Partial<{
  isOpen: boolean;
  message: string;
  description: string;
  title: string;
  confirmText: string;
  cancelText: string;
  dangerous: boolean;
  onResolve: (result: boolean) => void;
}> = {}) {
  const defaults = {
    isOpen: true,
    message: 'Are you sure?',
    onResolve: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  return { ...render(<ConfirmDialog {...props} />), onResolve: props.onResolve };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfirmDialog', () => {
  // -- Render basics --------------------------------------------------------

  it('renders when isOpen is true', () => {
    renderDialog();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderDialog({ isOpen: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('displays the message', () => {
    renderDialog({ message: 'Delete this course?' });
    expect(screen.getByText('Delete this course?')).toBeInTheDocument();
  });

  it('uses default title "Confirm"', () => {
    renderDialog();
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toHaveTextContent('Confirm');
  });

  it('uses custom title', () => {
    renderDialog({ title: 'Delete Course' });
    expect(screen.getByText('Delete Course')).toBeInTheDocument();
  });

  // -- Description ----------------------------------------------------------

  it('renders description when provided', () => {
    renderDialog({ description: 'This action is irreversible.' });
    expect(screen.getByText('This action is irreversible.')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = renderDialog();
    expect(container.querySelector('.confirm-dialog-description')).not.toBeInTheDocument();
  });

  // -- ARIA -----------------------------------------------------------------

  it('has role alertdialog and aria-modal', () => {
    renderDialog();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-label matching title', () => {
    renderDialog({ title: 'Warning' });
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-label', 'Warning');
  });

  // -- Confirm button -------------------------------------------------------

  it('renders Confirm button with default text', () => {
    renderDialog();
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toBeInTheDocument();
  });

  it('renders custom confirm text', () => {
    renderDialog({ confirmText: 'Yes, delete' });
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
  });

  it('calls onResolve(true) when confirm button clicked', () => {
    const { onResolve } = renderDialog({ confirmText: 'Delete' });
    fireEvent.click(screen.getByText('Delete'));
    expect(onResolve).toHaveBeenCalledWith(true);
  });

  // -- Cancel button --------------------------------------------------------

  it('renders Cancel button with default text', () => {
    renderDialog();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders custom cancel text', () => {
    renderDialog({ cancelText: 'No, keep it' });
    expect(screen.getByText('No, keep it')).toBeInTheDocument();
  });

  it('calls onResolve(false) when cancel button clicked', () => {
    const { onResolve } = renderDialog({ cancelText: 'Nope' });
    fireEvent.click(screen.getByText('Nope'));
    expect(onResolve).toHaveBeenCalledWith(false);
  });

  // -- Keyboard -------------------------------------------------------------

  it('calls onResolve(true) on Enter key', () => {
    const onResolve = vi.fn();
    const { container } = renderDialog({ onResolve });
    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.keyDown(overlay, { key: 'Enter' });
    expect(onResolve).toHaveBeenCalledWith(true);
  });

  it('calls onResolve(false) on Escape key', () => {
    const onResolve = vi.fn();
    const { container } = renderDialog({ onResolve });
    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.keyDown(overlay, { key: 'Escape' });
    expect(onResolve).toHaveBeenCalledWith(false);
  });

  // -- Backdrop click -------------------------------------------------------

  it('calls onResolve(false) on backdrop click', () => {
    const onResolve = vi.fn();
    const { container } = renderDialog({ onResolve });
    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.click(overlay);
    expect(onResolve).toHaveBeenCalledWith(false);
  });

  it('does not resolve on modal content click', () => {
    const onResolve = vi.fn();
    renderDialog({ onResolve, message: 'Really?' });
    fireEvent.click(screen.getByText('Really?'));
    expect(onResolve).not.toHaveBeenCalled();
  });

  // -- Dangerous mode -------------------------------------------------------

  it('applies btn-danger class in dangerous mode', () => {
    const { container } = renderDialog({ dangerous: true });
    expect(container.querySelector('.btn-danger')).toBeInTheDocument();
  });

  it('applies btn-primary class in non-dangerous mode', () => {
    const { container } = renderDialog({ dangerous: false });
    expect(container.querySelector('.btn-primary')).toBeInTheDocument();
  });

  // -- CSS classes ----------------------------------------------------------

  it('confirm dialog has correct CSS classes', () => {
    const { container } = renderDialog();
    expect(container.querySelector('.confirm-dialog-modal')).toBeInTheDocument();
    expect(container.querySelector('.confirm-dialog-actions')).toBeInTheDocument();
  });
});
