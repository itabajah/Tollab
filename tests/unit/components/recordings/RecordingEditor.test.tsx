import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpdateRecording = vi.fn();

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      updateRecording: mockUpdateRecording,
    }),
}));

vi.mock('@/utils/dom', () => ({
  getInputValue: (e: Event) => (e.currentTarget as HTMLInputElement).value,
}));

vi.mock('@/utils/validation', () => ({
  validateUrl: (url: string) => ({ valid: url.startsWith('http') }),
}));

import { RecordingEditor } from '@/components/recordings/RecordingEditor';
import type { RecordingItem } from '@/types';

function makeRecording(overrides: Partial<RecordingItem> = {}): RecordingItem {
  return {
    name: 'Lecture 1',
    videoLink: 'https://youtube.com/v1',
    slideLink: 'https://slides.com/s1',
    watched: false,
    ...overrides,
  };
}

const defaultProps = {
  courseId: 'c1',
  tabId: 'tab1',
  recordingIndex: 0,
  recording: makeRecording(),
  onClose: vi.fn(),
};

describe('RecordingEditor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crash', () => {
    render(<RecordingEditor {...defaultProps} />);
    expect(screen.getByDisplayValue('Lecture 1')).toBeInTheDocument();
  });

  it('renders three input fields', () => {
    render(<RecordingEditor {...defaultProps} />);
    expect(screen.getByDisplayValue('Lecture 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://youtube.com/v1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://slides.com/s1')).toBeInTheDocument();
  });

  it('renders Save and Cancel buttons', () => {
    render(<RecordingEditor {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders labels for Name, Video, Slides', () => {
    render(<RecordingEditor {...defaultProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('Slides')).toBeInTheDocument();
  });

  it('allows editing the name field', () => {
    render(<RecordingEditor {...defaultProps} />);
    const nameInput = screen.getByDisplayValue('Lecture 1');
    fireEvent.input(nameInput, { target: { value: 'Lecture 2' } });
    expect(nameInput).toHaveValue('Lecture 2');
  });

  it('allows editing the video field', () => {
    render(<RecordingEditor {...defaultProps} />);
    const videoInput = screen.getByDisplayValue('https://youtube.com/v1');
    fireEvent.input(videoInput, { target: { value: 'https://youtube.com/v2' } });
    expect(videoInput).toHaveValue('https://youtube.com/v2');
  });

  it('calls updateRecording and onClose when Save is clicked', () => {
    render(<RecordingEditor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockUpdateRecording).toHaveBeenCalledWith('c1', 'tab1', 0, {
      name: 'Lecture 1',
      videoLink: 'https://youtube.com/v1',
      slideLink: 'https://slides.com/s1',
    });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('strips invalid URLs on save', () => {
    const rec = makeRecording({ videoLink: 'not-a-url', slideLink: 'also-bad' });
    render(<RecordingEditor {...defaultProps} recording={rec} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockUpdateRecording).toHaveBeenCalledWith('c1', 'tab1', 0, {
      name: 'Lecture 1',
      videoLink: '',
      slideLink: '',
    });
  });

  it('falls back to original name when name is empty on save', () => {
    render(<RecordingEditor {...defaultProps} />);
    const nameInput = screen.getByDisplayValue('Lecture 1');
    fireEvent.input(nameInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockUpdateRecording).toHaveBeenCalledWith('c1', 'tab1', 0, expect.objectContaining({
      name: 'Lecture 1',
    }));
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<RecordingEditor {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('saves on Enter key in any input', () => {
    render(<RecordingEditor {...defaultProps} />);
    fireEvent.keyDown(screen.getByDisplayValue('Lecture 1'), { key: 'Enter' });
    expect(mockUpdateRecording).toHaveBeenCalledOnce();
  });

  it('cancels on Escape key in any input', () => {
    const onClose = vi.fn();
    render(<RecordingEditor {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(screen.getByDisplayValue('Lecture 1'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockUpdateRecording).not.toHaveBeenCalled();
  });

  it('handles recording with empty strings', () => {
    const rec = makeRecording({ name: '', videoLink: '', slideLink: '' });
    render(<RecordingEditor {...defaultProps} recording={rec} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});