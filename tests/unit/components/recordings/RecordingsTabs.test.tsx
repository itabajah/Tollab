/**
 * Tests for RecordingsTabs component.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetRecordingsTab = vi.fn();
const mockAddRecordingTab = vi.fn();
const mockRenameRecordingTab = vi.fn();
const mockDeleteRecordingTab = vi.fn();
const mockClearRecordingTab = vi.fn();

vi.mock('@/store/ui-store', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setRecordingsTab: mockSetRecordingsTab }),
}));

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      addRecordingTab: mockAddRecordingTab,
      renameRecordingTab: mockRenameRecordingTab,
      deleteRecordingTab: mockDeleteRecordingTab,
      clearRecordingTab: mockClearRecordingTab,
    }),
}));

vi.mock('@/constants', () => ({
  PROTECTED_TAB_IDS: new Set(['lectures']),
}));

import { RecordingsTabs } from '@/components/recordings/RecordingsTabs';
import type { RecordingTab } from '@/types';

const mockTabs: RecordingTab[] = [
  { id: 'lectures', name: 'Lectures', items: [{ name: 'L1', videoLink: '', slideLink: '', watched: false }] },
  { id: 'custom-1', name: 'Custom', items: [] },
];

function renderTabs(overrides: Partial<{
  courseId: string;
  tabs: RecordingTab[];
  activeTabIndex: number;
  showWatched: boolean;
  onToggleShowWatched: () => void;
  onOpenFetchModal: () => void;
}> = {}) {
  const defaults = {
    courseId: 'c1',
    tabs: mockTabs,
    activeTabIndex: 0,
    showWatched: true,
    onToggleShowWatched: vi.fn(),
    onOpenFetchModal: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  return render(<RecordingsTabs {...props} />);
}

describe('RecordingsTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('prompt', vi.fn());
    vi.stubGlobal('confirm', vi.fn());
  });

  it('renders tab buttons', () => {
    renderTabs();
    expect(screen.getByText('Lectures')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('renders item count badges', () => {
    renderTabs();
    // Lectures has 1 item, Custom has 0
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('marks active tab with active class', () => {
    renderTabs({ activeTabIndex: 0 });
    const tabs = screen.getAllByRole('button').filter((b) => b.textContent?.includes('Lectures'));
    expect(tabs[0]?.className).toContain('active');
  });

  it('switches tab on click', () => {
    renderTabs();
    const customTab = screen.getAllByRole('button').find(
      (b) => b.textContent?.includes('Custom') && b.className.includes('recordings-tab'),
    )!;
    fireEvent.click(customTab);
    expect(mockSetRecordingsTab).toHaveBeenCalledWith(1);
  });

  it('adds tab via prompt', () => {
    (globalThis.prompt as ReturnType<typeof vi.fn>).mockReturnValue('New Tab');
    renderTabs();
    const addBtn = screen.getAllByTitle('Add Custom Tab')[0]!;
    fireEvent.click(addBtn);
    expect(mockAddRecordingTab).toHaveBeenCalledWith('c1', 'New Tab');
    expect(mockSetRecordingsTab).toHaveBeenCalledWith(2);
  });

  it('does not add tab when prompt returns null', () => {
    (globalThis.prompt as ReturnType<typeof vi.fn>).mockReturnValue(null);
    renderTabs();
    const addBtn = screen.getAllByTitle('Add Custom Tab')[0]!;
    fireEvent.click(addBtn);
    expect(mockAddRecordingTab).not.toHaveBeenCalled();
  });

  it('does not add tab when prompt returns empty', () => {
    (globalThis.prompt as ReturnType<typeof vi.fn>).mockReturnValue('   ');
    renderTabs();
    const addBtn = screen.getAllByTitle('Add Custom Tab')[0]!;
    fireEvent.click(addBtn);
    expect(mockAddRecordingTab).not.toHaveBeenCalled();
  });

  it('disables delete for protected tabs', () => {
    renderTabs({ activeTabIndex: 0 }); // lectures is protected
    const deleteBtn = screen.getByTitle('Delete Tab');
    expect(deleteBtn).toBeDisabled();
  });

  it('enables delete for custom tabs', () => {
    renderTabs({ activeTabIndex: 1 }); // custom-1 is not protected
    const deleteBtn = screen.getByTitle('Delete Tab');
    expect(deleteBtn).not.toBeDisabled();
  });

  it('deletes tab with confirmation', () => {
    (globalThis.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    renderTabs({ activeTabIndex: 1 });
    fireEvent.click(screen.getByTitle('Delete Tab'));
    expect(mockDeleteRecordingTab).toHaveBeenCalledWith('c1', 'custom-1');
  });

  it('does not delete when confirm returns false', () => {
    (globalThis.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    renderTabs({ activeTabIndex: 1 });
    fireEvent.click(screen.getByTitle('Delete Tab'));
    expect(mockDeleteRecordingTab).not.toHaveBeenCalled();
  });

  it('clears tab with confirmation', () => {
    (globalThis.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    renderTabs();
    fireEvent.click(screen.getByTitle('Clear All Videos'));
    expect(mockClearRecordingTab).toHaveBeenCalledWith('c1', 'lectures');
  });

  it('renames tab via prompt', () => {
    (globalThis.prompt as ReturnType<typeof vi.fn>).mockReturnValue('New Name');
    renderTabs();
    fireEvent.click(screen.getByTitle('Rename Tab'));
    expect(mockRenameRecordingTab).toHaveBeenCalledWith('c1', 'lectures', 'New Name');
  });

  it('does not rename when prompt matches existing name', () => {
    (globalThis.prompt as ReturnType<typeof vi.fn>).mockReturnValue('Lectures');
    renderTabs();
    fireEvent.click(screen.getByTitle('Rename Tab'));
    expect(mockRenameRecordingTab).not.toHaveBeenCalled();
  });

  it('toggles actions panel', () => {
    const { container } = renderTabs();
    const toggleBtn = screen.getByText('Recording Actions').closest('button')!;
    fireEvent.click(toggleBtn);
    expect(container.querySelector('.recordings-control-panel-content.expanded')).toBeTruthy();
  });

  it('renders show watched toggle', () => {
    renderTabs();
    expect(screen.getByText('Show Done')).toBeInTheDocument();
  });

  it('calls onToggleShowWatched', () => {
    const onToggle = vi.fn();
    renderTabs({ onToggleShowWatched: onToggle });
    const checkbox = screen.getByText('Show Done').closest('label')!.querySelector('input')!;
    fireEvent.change(checkbox);
    expect(onToggle).toHaveBeenCalled();
  });

  it('calls onOpenFetchModal', () => {
    const onFetch = vi.fn();
    renderTabs({ onOpenFetchModal: onFetch });
    fireEvent.click(screen.getByTitle('Import from YouTube/Panopto'));
    expect(onFetch).toHaveBeenCalled();
  });
});
