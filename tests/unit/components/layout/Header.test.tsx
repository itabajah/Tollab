/**
 * Tests for Header component.
 *
 * Covers: render, brand text, theme toggle, settings button,
 * cloud sync status display.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseSyncState } from '@/types';

// ---------------------------------------------------------------------------
// Mock stores
// ---------------------------------------------------------------------------

let mockTheme = 'dark';
const mockUpdateSettings = vi.fn();

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      settings: { theme: mockTheme },
      updateSettings: mockUpdateSettings,
    }),
}));

// Mock SettingsModal as a simple stub (lazy-loaded via dynamic import)
vi.mock('@/components/modals/SettingsModal', () => ({
  SettingsModal: ({ isOpen }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="settings-modal">Settings Modal</div> : null,
}));

const { Header } = await import('@/components/layout/Header');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Header', () => {
  beforeEach(() => {
    mockTheme = 'dark';
    vi.clearAllMocks();
  });

  // -- Brand ----------------------------------------------------------------

  it('renders without crash', () => {
    render(<Header />);
    expect(screen.getByText('Tollab')).toBeInTheDocument();
  });

  it('displays brand subtitle', () => {
    render(<Header />);
    expect(screen.getByText('For Technionez')).toBeInTheDocument();
  });

  // -- Theme toggle ---------------------------------------------------------

  it('renders theme toggle button', () => {
    render(<Header />);
    expect(screen.getByTitle('Toggle Theme')).toBeInTheDocument();
  });

  it('calls updateSettings with light when current is dark', () => {
    mockTheme = 'dark';
    render(<Header />);
    fireEvent.click(screen.getByTitle('Toggle Theme'));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('calls updateSettings with dark when current is light', () => {
    mockTheme = 'light';
    render(<Header />);
    fireEvent.click(screen.getByTitle('Toggle Theme'));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'dark' });
  });

  // -- Settings button ------------------------------------------------------

  it('renders settings button', () => {
    render(<Header />);
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
  });

  it('opens settings modal on settings button click', async () => {
    render(<Header />);
    fireEvent.click(screen.getByTitle('Settings'));
    expect(await screen.findByTestId('settings-modal')).toBeInTheDocument();
  });

  // -- Cloud sync status ----------------------------------------------------

  it('shows "Not connected" by default', () => {
    render(<Header />);
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('shows "Synced" status', () => {
    render(<Header syncState={FirebaseSyncState.Synced} />);
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });

  it('shows "Synced" with email', () => {
    render(<Header syncState={FirebaseSyncState.Synced} userEmail="test@example.com" />);
    expect(screen.getByText('Synced (test@example.com)')).toBeInTheDocument();
  });

  it('shows "Syncing…" status', () => {
    render(<Header syncState={FirebaseSyncState.Syncing} />);
    expect(screen.getByText('Syncing…')).toBeInTheDocument();
  });

  it('shows "Sync error" status', () => {
    render(<Header syncState={FirebaseSyncState.Error} />);
    expect(screen.getByText('Sync error')).toBeInTheDocument();
  });

  it('shows "Not connected" for disconnected', () => {
    render(<Header syncState={FirebaseSyncState.Disconnected} />);
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });
});
