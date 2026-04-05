/**
 * Tests for RecordingItem component.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockToggleRecordingWatched = vi.fn();
const mockDeleteRecording = vi.fn();
const mockReorderRecording = vi.fn();
const mockSetTempRecordingEdit = vi.fn();

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      toggleRecordingWatched: mockToggleRecordingWatched,
      deleteRecording: mockDeleteRecording,
      reorderRecording: mockReorderRecording,
    }),
}));

vi.mock('@/store/ui-store', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setTempRecordingEdit: mockSetTempRecordingEdit }),
}));

vi.mock('@/utils/video', () => ({
  supportsInlinePreview: (link: string) => link.includes('youtube.com'),
  getVideoEmbedInfo: (link: string) => ({
    embedUrl: link.includes('youtube.com') ? `https://youtube.com/embed/${link.split('v=')[1]}` : '',
    platform: link.includes('youtube.com') ? 'youtube' : 'unknown',
  }),
}));

vi.mock('@/utils/dom', () => ({
  handleKeyActivate: (cb: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') cb();
  },
}));

vi.mock('@/components/recordings/RecordingEditor', () => ({
  RecordingEditor: () => <div data-testid="recording-editor" />,
}));

vi.mock('@/components/recordings/VideoPreview', () => ({
  VideoPreview: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="video-preview">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

import { RecordingItem } from '@/components/recordings/RecordingItem';
import type { RecordingItem as RecordingItemType } from '@/types';

const baseRecording: RecordingItemType = {
  name: 'Lecture 1',
  videoLink: 'https://youtube.com/watch?v=abc',
  slideLink: 'https://slides.com/1',
  watched: false,
};

function renderItem(overrides: Partial<{
  courseId: string;
  tabId: string;
  tabIndex: number;
  originalIndex: number;
  recording: RecordingItemType;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  previewIndex: number | null;
  onPreviewToggle: (index: number) => void;
  sortOrder: string;
}> = {}) {
  const defaults = {
    courseId: 'c1',
    tabId: 'lectures',
    tabIndex: 0,
    originalIndex: 0,
    recording: baseRecording,
    isFirst: false,
    isLast: false,
    isEditing: false,
    previewIndex: null,
    onPreviewToggle: vi.fn(),
    sortOrder: 'manual',
  };
  const props = { ...defaults, ...overrides };
  return { ...render(<RecordingItem {...props} />), onPreviewToggle: props.onPreviewToggle };
}

describe('RecordingItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recording name', () => {
    renderItem();
    expect(screen.getByText('Lecture 1')).toBeInTheDocument();
  });

  it('renders watched checkbox', () => {
    renderItem();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('renders watched checkbox as checked when watched', () => {
    renderItem({ recording: { ...baseRecording, watched: true } });
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('toggles watched state on checkbox change', () => {
    renderItem();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(mockToggleRecordingWatched).toHaveBeenCalledWith('c1', 'lectures', 0);
  });

  it('applies watched CSS class', () => {
    const { container } = renderItem({ recording: { ...baseRecording, watched: true } });
    expect(container.querySelector('.recording-item.watched')).toBeTruthy();
  });

  it('renders edit button', () => {
    renderItem();
    expect(screen.getByTitle('Edit recording')).toBeInTheDocument();
  });

  it('enters edit mode', () => {
    renderItem();
    fireEvent.click(screen.getByTitle('Edit recording'));
    expect(mockSetTempRecordingEdit).toHaveBeenCalledWith({ tabIndex: 0, recordingIndex: 0 });
  });

  it('renders delete button', () => {
    renderItem();
    expect(screen.getByTitle('Delete recording')).toBeInTheDocument();
  });

  it('deletes recording on button click', () => {
    renderItem();
    fireEvent.click(screen.getByTitle('Delete recording'));
    expect(mockDeleteRecording).toHaveBeenCalledWith('c1', 'lectures', 0);
  });

  it('renders reorder buttons in manual sort', () => {
    renderItem({ sortOrder: 'manual' });
    expect(screen.getByLabelText('Move up')).toBeInTheDocument();
    expect(screen.getByLabelText('Move down')).toBeInTheDocument();
  });

  it('hides reorder buttons when not manual sort', () => {
    renderItem({ sortOrder: 'name_asc' });
    expect(screen.queryByLabelText('Move up')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Move down')).not.toBeInTheDocument();
  });

  it('disables move up for first item', () => {
    renderItem({ isFirst: true });
    expect(screen.getByLabelText('Move up')).toBeDisabled();
  });

  it('disables move down for last item', () => {
    renderItem({ isLast: true });
    expect(screen.getByLabelText('Move down')).toBeDisabled();
  });

  it('reorders up on button click', () => {
    renderItem();
    fireEvent.click(screen.getByLabelText('Move up'));
    expect(mockReorderRecording).toHaveBeenCalledWith('c1', 'lectures', 0, 'up');
  });

  it('reorders down on button click', () => {
    renderItem();
    fireEvent.click(screen.getByLabelText('Move down'));
    expect(mockReorderRecording).toHaveBeenCalledWith('c1', 'lectures', 0, 'down');
  });

  it('renders Video link', () => {
    renderItem();
    expect(screen.getByText('Video')).toBeInTheDocument();
  });

  it('renders Slides link', () => {
    renderItem();
    expect(screen.getByText('Slides')).toBeInTheDocument();
  });

  it('hides Slides link when no slideLink', () => {
    renderItem({ recording: { ...baseRecording, slideLink: '' } });
    expect(screen.queryByText('Slides')).not.toBeInTheDocument();
  });

  it('shows preview hint for embeddable videos', () => {
    renderItem();
    expect(screen.getByText('Click to preview')).toBeInTheDocument();
  });

  it('shows "Click to close" when preview is open', () => {
    renderItem({ previewIndex: 0 });
    expect(screen.getByText('Click to close')).toBeInTheDocument();
  });

  it('toggles preview on content click for embeddable videos', () => {
    const { onPreviewToggle } = renderItem();
    const clickable = screen.getByText('Click to preview').closest('[role="button"]')!;
    fireEvent.click(clickable);
    expect(onPreviewToggle).toHaveBeenCalledWith(0);
  });

  it('renders editor when in editing mode', () => {
    renderItem({ isEditing: true });
    expect(screen.getByTestId('recording-editor')).toBeInTheDocument();
  });

  it('renders video preview when open and embeddable', () => {
    renderItem({ previewIndex: 0 });
    expect(screen.getByTestId('video-preview')).toBeInTheDocument();
  });

  it('does not render video preview when not open', () => {
    renderItem({ previewIndex: null });
    expect(screen.queryByTestId('video-preview')).not.toBeInTheDocument();
  });

  it('renders accessible checkbox label', () => {
    renderItem();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.getAttribute('aria-label')).toContain('Lecture 1');
  });
});
