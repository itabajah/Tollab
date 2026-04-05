/**
 * Tests for ProfileTab settings component.
 */

import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSwitchProfile = vi.fn();
const mockRenameProfile = vi.fn();
const mockCreateProfile = vi.fn();
const mockDeleteProfile = vi.fn();
const mockExportProfile = vi.fn();
const mockImportProfile = vi.fn();

let mockProfiles = [
  { id: 'p1', name: 'Default' },
  { id: 'p2', name: 'Work' },
];
let mockActiveProfileId = 'p1';

vi.mock('@/store/profile-store', () => ({
  useProfileStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      profiles: mockProfiles,
      activeProfileId: mockActiveProfileId,
      switchProfile: mockSwitchProfile,
      renameProfile: mockRenameProfile,
      createProfile: mockCreateProfile,
      deleteProfile: mockDeleteProfile,
      exportProfile: mockExportProfile,
      importProfile: mockImportProfile,
    }),
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, variant }: Record<string, unknown>) => (
    <button onClick={onClick as () => void} disabled={disabled as boolean} data-variant={variant}>
      {children as string}
    </button>
  ),
  Select: ({
    options,
    value,
    onChange,
  }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (val: string) => void;
  }) => (
    <select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)} data-testid="profile-select">
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/utils/dom', () => ({
  getInputValue: (e: { target: { value: string } }) => e.target.value,
}));

import { ProfileTab } from '@/components/settings/ProfileTab';

describe('ProfileTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockProfiles = [
      { id: 'p1', name: 'Default' },
      { id: 'p2', name: 'Work' },
    ];
    mockActiveProfileId = 'p1';
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders profile selector', () => {
    render(<ProfileTab />);
    expect(screen.getByTestId('profile-select')).toBeInTheDocument();
  });

  it('renders profile options', () => {
    render(<ProfileTab />);
    const select = screen.getByTestId('profile-select') as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
  });

  it('switches profile on select change', () => {
    render(<ProfileTab />);
    const select = screen.getByTestId('profile-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'p2' } });
    expect(mockSwitchProfile).toHaveBeenCalledWith('p2');
  });

  it('creates new profile on button click', () => {
    render(<ProfileTab />);
    fireEvent.click(screen.getByText('+ New Profile'));
    expect(mockCreateProfile).toHaveBeenCalledWith('Profile 3');
  });

  it('starts rename on rename button click', () => {
    render(<ProfileTab />);
    fireEvent.click(screen.getByText('✎'));
    // Should show input field now
    expect(screen.getByLabelText('Profile name')).toBeInTheDocument();
  });

  it('saves rename on Save button click', () => {
    render(<ProfileTab />);
    fireEvent.click(screen.getByText('✎'));
    const input = screen.getByLabelText('Profile name') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByText('Save'));
    expect(mockRenameProfile).toHaveBeenCalledWith('p1', 'New Name');
  });

  it('cancels rename on Escape', () => {
    render(<ProfileTab />);
    fireEvent.click(screen.getByText('✎'));
    const input = screen.getByLabelText('Profile name');
    fireEvent.keyDown(input, { key: 'Escape' });
    // Should go back to select mode
    expect(screen.getByTestId('profile-select')).toBeInTheDocument();
  });

  it('saves rename on Enter', () => {
    render(<ProfileTab />);
    fireEvent.click(screen.getByText('✎'));
    const input = screen.getByLabelText('Profile name');
    fireEvent.input(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockRenameProfile).toHaveBeenCalledWith('p1', 'Renamed');
  });

  it('does not rename to same name', () => {
    render(<ProfileTab />);
    fireEvent.click(screen.getByText('✎'));
    const input = screen.getByLabelText('Profile name');
    fireEvent.input(input, { target: { value: 'Default' } });
    fireEvent.click(screen.getByText('Save'));
    expect(mockRenameProfile).not.toHaveBeenCalled();
  });

  it('exports profile on Export click', () => {
    mockExportProfile.mockReturnValue('{"data":"test"}');
    const origCreateObjectURL = globalThis.URL.createObjectURL;
    const origRevokeObjectURL = globalThis.URL.revokeObjectURL;
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    globalThis.URL.revokeObjectURL = vi.fn();

    render(<ProfileTab />);
    fireEvent.click(screen.getByText(/Export/));
    expect(mockExportProfile).toHaveBeenCalledWith('p1');

    globalThis.URL.createObjectURL = origCreateObjectURL;
    globalThis.URL.revokeObjectURL = origRevokeObjectURL;
  });

  it('does not export when exportProfile returns null', () => {
    mockExportProfile.mockReturnValue(null);
    const origCreateObjectURL = globalThis.URL.createObjectURL;
    globalThis.URL.createObjectURL = vi.fn();

    render(<ProfileTab />);
    fireEvent.click(screen.getByText(/Export/));
    expect(globalThis.URL.createObjectURL).not.toHaveBeenCalled();

    globalThis.URL.createObjectURL = origCreateObjectURL;
  });

  it('disables delete when only one profile', () => {
    mockProfiles = [{ id: 'p1', name: 'Default' }];
    render(<ProfileTab />);
    const deleteBtn = screen.getByText(/Delete Profile/);
    expect(deleteBtn).toBeDisabled();
  });

  it('shows confirmation on delete click', () => {
    render(<ProfileTab />);
    fireEvent.click(screen.getByText(/Delete Profile/));
    expect(screen.getByText('Delete this profile permanently?')).toBeInTheDocument();
  });

  it('deletes profile on confirm', () => {
    render(<ProfileTab />);
    fireEvent.click(screen.getByText(/Delete Profile/));
    fireEvent.click(screen.getByText('Confirm Delete'));
    expect(mockDeleteProfile).toHaveBeenCalledWith('p1');
  });

  it('cancels delete on cancel button', () => {
    render(<ProfileTab />);
    fireEvent.click(screen.getByText(/Delete Profile/));
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockDeleteProfile).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete this profile permanently?')).not.toBeInTheDocument();
  });

  it('does not show confirm when only one profile', () => {
    mockProfiles = [{ id: 'p1', name: 'Default' }];
    render(<ProfileTab />);
    fireEvent.click(screen.getByText(/Delete Profile/));
    expect(screen.queryByText('Delete this profile permanently?')).not.toBeInTheDocument();
  });

  it('renders cloud sync section', () => {
    render(<ProfileTab />);
    expect(screen.getByText(/Cloud Sync/)).toBeInTheDocument();
  });

  it('renders import button', () => {
    render(<ProfileTab />);
    expect(screen.getByText(/Import/)).toBeInTheDocument();
  });

  it('renders local data management section', () => {
    render(<ProfileTab />);
    expect(screen.getByText('Local Data Management')).toBeInTheDocument();
  });
});
