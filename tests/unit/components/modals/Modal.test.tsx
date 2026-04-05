/**
 * Tests for Modal component.
 *
 * Covers: render open/closed, title, children, backdrop click, Escape key,
 * close button, size variants, ARIA attributes, className prop.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '@/components/modals/Modal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderModal(overrides: Partial<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size: 'sm' | 'md' | 'lg';
  className: string;
  children: preact.ComponentChildren;
}> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };
  const props = { ...defaults, ...overrides };
  return { ...render(<Modal {...props}>{props.children}</Modal>), onClose: props.onClose };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Modal', () => {
  // -- Render basics --------------------------------------------------------

  it('renders when isOpen is true', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the title', () => {
    renderModal({ title: 'Edit Course' });
    expect(screen.getByText('Edit Course')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderModal({ children: <span>Child content</span> });
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  // -- ARIA attributes ------------------------------------------------------

  it('has aria-modal="true"', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-label matching title', () => {
    renderModal({ title: 'Settings' });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Settings');
  });

  // -- Close button ---------------------------------------------------------

  it('renders a close button', () => {
    renderModal();
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // -- Backdrop click -------------------------------------------------------

  it('calls onClose when backdrop overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Modal content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  // -- Escape key -----------------------------------------------------------

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.keyDown(overlay, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for non-Escape keys', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.keyDown(overlay, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });

  // -- Size variants --------------------------------------------------------

  it('applies confirm-dialog-modal class for sm size', () => {
    renderModal({ size: 'sm' });
    expect(screen.getByRole('dialog')).toHaveClass('confirm-dialog-modal');
  });

  it('applies modal-wide class for lg size', () => {
    renderModal({ size: 'lg' });
    expect(screen.getByRole('dialog')).toHaveClass('modal-wide');
  });

  it('has just modal class for md size (default)', () => {
    renderModal({ size: 'md' });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('modal');
    expect(dialog).not.toHaveClass('confirm-dialog-modal');
    expect(dialog).not.toHaveClass('modal-wide');
  });

  // -- className prop -------------------------------------------------------

  it('appends className to modal element', () => {
    renderModal({ className: 'custom-modal' });
    expect(screen.getByRole('dialog')).toHaveClass('custom-modal');
  });

  // -- Overlay classes ------------------------------------------------------

  it('overlay has active class', () => {
    const { container } = renderModal();
    expect(container.querySelector('.modal-overlay')).toHaveClass('active');
  });
});
