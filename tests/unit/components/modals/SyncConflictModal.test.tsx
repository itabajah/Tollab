/**
 * Tests for SyncConflictModal component.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/modals/useFocusTrap', () => ({
  useFocusTrap: () => ({ handleTabKey: vi.fn() }),
}));

import { SyncConflictModal } from '@/components/modals/SyncConflictModal';
import type { SyncConflictInfo, SyncConflictResolution } from '@/types';

const mockConflict: SyncConflictInfo = {
  localProfileCount: 2,
  cloudProfileCount: 3,
  localLastModified: '2025-06-10T12:00:00.000Z',
  cloudLastModified: '2025-06-11T15:30:00.000Z',
};

function renderModal(overrides: Partial<{
  isOpen: boolean;
  conflict: SyncConflictInfo | null;
  onResolve: (choice: SyncConflictResolution | null) => void;
}> = {}) {
  const defaults = {
    isOpen: true,
    conflict: mockConflict,
    onResolve: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  return { ...render(<SyncConflictModal {...props} />), onResolve: props.onResolve };
}

describe('SyncConflictModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders nothing when conflict is null', () => {
    renderModal({ conflict: null });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open with conflict', () => {
    renderModal();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('displays the title', () => {
    renderModal();
    expect(screen.getByText(/Sync Conflict Detected/)).toBeInTheDocument();
  });

  it('displays conflict description', () => {
    renderModal();
    expect(screen.getByText(/cloud data is different/i)).toBeInTheDocument();
  });

  it('shows local profile count', () => {
    renderModal();
    expect(screen.getByText(/2 profiles/)).toBeInTheDocument();
  });

  it('shows cloud profile count', () => {
    renderModal();
    expect(screen.getByText(/3 profiles/)).toBeInTheDocument();
  });

  it('uses singular form for 1 profile', () => {
    renderModal({
      conflict: { ...mockConflict, localProfileCount: 1, cloudProfileCount: 1 },
    });
    const text = screen.getByRole('alertdialog').textContent!;
    // Should contain "1 profile" (singular) not "1 profiles"
    expect(text).toContain('1 profile');
  });

  it('shows local last modified date', () => {
    renderModal();
    // Should show formatted date
    expect(screen.getByText(/Local:/)).toBeInTheDocument();
  });

  it('shows cloud last modified date', () => {
    renderModal();
    expect(screen.getByText(/Cloud:/)).toBeInTheDocument();
  });

  it('shows "Unknown" for null dates', () => {
    renderModal({
      conflict: { ...mockConflict, localLastModified: null, cloudLastModified: null },
    });
    // formatDate returns 'Unknown' for null
    expect(screen.queryByText(/Unknown/)).toBeFalsy;
  });

  it('resolves with use_cloud on Use Cloud Data click', () => {
    const { onResolve } = renderModal();
    fireEvent.click(screen.getByText('Use Cloud Data'));
    expect(onResolve).toHaveBeenCalledWith('use_cloud');
  });

  it('resolves with use_local on Use Local Data click', () => {
    const { onResolve } = renderModal();
    fireEvent.click(screen.getByText('Use Local Data'));
    expect(onResolve).toHaveBeenCalledWith('use_local');
  });

  it('resolves with merge on Merge Both click', () => {
    const { onResolve } = renderModal();
    fireEvent.click(screen.getByText('Merge Both'));
    expect(onResolve).toHaveBeenCalledWith('merge');
  });

  it('resolves with null on Cancel click', () => {
    const { onResolve } = renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onResolve).toHaveBeenCalledWith(null);
  });

  it('resolves with null on Escape key', () => {
    const { onResolve } = renderModal();
    fireEvent.keyDown(screen.getByRole('alertdialog').parentElement!, { key: 'Escape' });
    expect(onResolve).toHaveBeenCalledWith(null);
  });

  it('resolves with null on overlay click', () => {
    const { onResolve } = renderModal();
    const overlay = screen.getByRole('alertdialog').parentElement!;
    fireEvent.click(overlay, { target: overlay });
    expect(onResolve).toHaveBeenCalledWith(null);
  });

  it('does not resolve when clicking inside modal', () => {
    const { onResolve } = renderModal();
    fireEvent.click(screen.getByRole('alertdialog'));
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('has correct aria attributes', () => {
    renderModal();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Sync Conflict Detected');
  });

  it('displays resolution option descriptions', () => {
    renderModal();
    expect(screen.getByText(/Replace local data with cloud data/)).toBeInTheDocument();
    expect(screen.getByText(/Upload local data to cloud/)).toBeInTheDocument();
    expect(screen.getByText(/Combine data from both sources/)).toBeInTheDocument();
  });
});
