import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddRecording = vi.fn();
const mockSetRecordingSortOrder = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      settings: { showWatchedRecordings: true },
      recordingSortOrders: {},
      addRecording: mockAddRecording,
      setRecordingSortOrder: mockSetRecordingSortOrder,
      updateSettings: mockUpdateSettings,
    }),
}));

vi.mock('@/store/selectors', () => ({
  useCourseById: () => ({
    id: 'c1',
    name: 'CS 101',
    recordings: {
      tabs: [
        { id: 'tab1', name: 'Lectures', items: [{ name: 'Lec 1', videoLink: 'https://x.com/1', slideLink: '', watched: false }] },
      ],
    },
  }),
  useSortedRecordings: () => [
    { item: { name: 'Lec 1', videoLink: 'https://x.com/1', slideLink: '', watched: false }, originalIndex: 0 },
  ],
}));

vi.mock('@/store/ui-store', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      currentRecordingsTab: 0,
      tempRecordingEdit: null,
    }),
}));

vi.mock('@/utils/dom', () => ({
  getInputValue: (e: Event) => (e.currentTarget as HTMLInputElement).value,
  getSelectValue: (e: Event) => (e.currentTarget as HTMLSelectElement).value,
}));

vi.mock('@/constants', () => ({
  RECORDING_SORT_ORDERS: {
    DEFAULT: 'default',
    MANUAL: 'manual',
    NAME_ASC: 'name_asc',
  },
}));

vi.mock('@/components/recordings/RecordingItem', () => ({
  RecordingItem: (props: { recording: { name: string } }) => (
    <div data-testid="recording-item">{props.recording.name}</div>
  ),
}));

vi.mock('@/components/recordings/RecordingsTabs', () => ({
  RecordingsTabs: () => <div data-testid="recordings-tabs">Tabs</div>,
}));

import { RecordingsPanel } from '@/components/recordings/RecordingsPanel';

describe('RecordingsPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const defaultProps = { courseId: 'c1', onOpenFetchModal: vi.fn() };

  it('renders without crash', () => {
    render(<RecordingsPanel {...defaultProps} />);
    expect(screen.getByTestId('recordings-tabs')).toBeInTheDocument();
  });

  it('renders the sort dropdown', () => {
    render(<RecordingsPanel {...defaultProps} />);
    expect(screen.getByLabelText('Sort recordings')).toBeInTheDocument();
  });

  it('renders sort options', () => {
    render(<RecordingsPanel {...defaultProps} />);
    const select = screen.getByLabelText('Sort recordings');
    const options = select.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(3);
  });

  it('renders recording items', () => {
    render(<RecordingsPanel {...defaultProps} />);
    expect(screen.getByTestId('recording-item')).toBeInTheDocument();
  });

  it('renders the add-recording input', () => {
    render(<RecordingsPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Paste video link/)).toBeInTheDocument();
  });

  it('renders the Add button', () => {
    render(<RecordingsPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('shows error when adding with empty link', () => {
    render(<RecordingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a video link');
    expect(mockAddRecording).not.toHaveBeenCalled();
  });

  it('adds recording when link is provided', () => {
    render(<RecordingsPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Paste video link/);
    fireEvent.input(input, { target: { value: 'https://youtu.be/abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(mockAddRecording).toHaveBeenCalledWith('c1', 'tab1', expect.objectContaining({
      videoLink: 'https://youtu.be/abc',
    }));
  });

  it('clears input after successful add', () => {
    render(<RecordingsPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Paste video link/) as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'https://youtu.be/abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(input.value).toBe('');
  });

  it('adds recording on Enter key', () => {
    render(<RecordingsPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Paste video link/);
    fireEvent.input(input, { target: { value: 'https://youtu.be/abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockAddRecording).toHaveBeenCalledOnce();
  });

  it('clears error on new input', () => {
    render(<RecordingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.input(screen.getByPlaceholderText(/Paste video link/), { target: { value: 'h' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls setRecordingSortOrder on sort change', () => {
    render(<RecordingsPanel {...defaultProps} />);
    fireEvent.change(screen.getByLabelText('Sort recordings'), { target: { value: 'name_asc' } });
    expect(mockSetRecordingSortOrder).toHaveBeenCalledWith('c1', 'tab1', 'name_asc');
  });
});