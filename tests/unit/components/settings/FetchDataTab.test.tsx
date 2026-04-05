/**
 * Tests for FetchDataTab settings component.
 */

import { render, screen, fireEvent, act } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockShowToast = vi.fn();
const mockImportSingleICS = vi.fn();
const mockImportBatchICS = vi.fn();
const mockFetchTechnionCatalog = vi.fn();

vi.mock('@/components/toast/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/hooks/useImportExport', () => ({
  useImportExport: () => ({
    isImporting: false,
    importProgress: '',
    isFetchingCatalog: false,
    catalogProgress: '',
    importSingleICS: mockImportSingleICS,
    importBatchICS: mockImportBatchICS,
    fetchTechnionCatalog: mockFetchTechnionCatalog,
  }),
}));

vi.mock('@/types', () => ({
  ToastType: { Info: 'info', Success: 'success', Error: 'error', Warning: 'warning' },
}));

vi.mock('@/utils/dom', () => ({
  getInputValue: (e: { target: { value: string } }) => e.target.value,
  getSelectValue: (e: { target: { value: string } }) => e.target.value,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, loading }: { children: unknown; onClick?: () => void; loading?: boolean }) => (
    <button onClick={onClick} disabled={loading as boolean}>
      {children as string}
    </button>
  ),
}));

import { FetchDataTab } from '@/components/settings/FetchDataTab';

describe('FetchDataTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the section title', () => {
    render(<FetchDataTab />);
    expect(screen.getByText('Fetch Data')).toBeInTheDocument();
  });

  it('renders ICS URL input', () => {
    const { container } = render(<FetchDataTab />);
    const input = container.querySelector('#ics-link-input');
    expect(input).toBeTruthy();
  });

  it('renders Fetch Schedule button', () => {
    render(<FetchDataTab />);
    expect(screen.getByText('Fetch Schedule')).toBeInTheDocument();
  });

  it('renders batch mode toggle', () => {
    render(<FetchDataTab />);
    expect(screen.getByText(/Fetch multiple semesters/)).toBeInTheDocument();
  });

  it('shows batch inputs when batch mode enabled', () => {
    render(<FetchDataTab />);
    const checkbox = screen.getByText(/Fetch multiple semesters/).closest('label')!.querySelector('input')!;
    fireEvent.change(checkbox);
    expect(screen.getByText('Start:')).toBeInTheDocument();
    expect(screen.getByText('End:')).toBeInTheDocument();
  });

  it('shows error status for empty URL when not batch mode', async () => {
    render(<FetchDataTab />);
    await act(async () => {
      fireEvent.click(screen.getByText('Fetch Schedule'));
    });
    expect(screen.getByText('Please enter an ICS URL.')).toBeInTheDocument();
  });

  it('calls importSingleICS on fetch with URL', async () => {
    mockImportSingleICS.mockResolvedValue({ semesterName: 'Winter 2025', count: 5 });
    const { container } = render(<FetchDataTab />);
    const input = container.querySelector('#ics-link-input')!;
    fireEvent.input(input, { target: { value: 'https://cheesefork.cf/test.ics' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Fetch Schedule'));
    });

    expect(mockImportSingleICS).toHaveBeenCalledWith('https://cheesefork.cf/test.ics');
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('handles import error gracefully', async () => {
    mockImportSingleICS.mockRejectedValue(new Error('Network error'));
    const { container } = render(<FetchDataTab />);
    const input = container.querySelector('#ics-link-input')!;
    fireEvent.input(input, { target: { value: 'https://cheesefork.cf/bad.ics' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Fetch Schedule'));
    });

    expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
  });

  it('renders technion catalog section', () => {
    render(<FetchDataTab />);
    expect(screen.getByText('Course Catalog (Technion)')).toBeInTheDocument();
  });

  it('renders Fetch Course Data button', () => {
    render(<FetchDataTab />);
    expect(screen.getByText('Fetch Course Data')).toBeInTheDocument();
  });

  it('calls fetchTechnionCatalog on button click', async () => {
    mockFetchTechnionCatalog.mockResolvedValue({ updatedCount: 3, catalogSize: 100 });
    render(<FetchDataTab />);

    await act(async () => {
      fireEvent.click(screen.getByText('Fetch Course Data'));
    });

    expect(mockFetchTechnionCatalog).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('shows status for no courses updated', async () => {
    mockFetchTechnionCatalog.mockResolvedValue({ updatedCount: 0, catalogSize: 50 });
    render(<FetchDataTab />);

    await act(async () => {
      fireEvent.click(screen.getByText('Fetch Course Data'));
    });

    expect(screen.getByText(/no courses needed updating/i)).toBeInTheDocument();
  });

  it('handles technion fetch error', async () => {
    mockFetchTechnionCatalog.mockRejectedValue(new Error('Timeout'));
    render(<FetchDataTab />);

    await act(async () => {
      fireEvent.click(screen.getByText('Fetch Course Data'));
    });

    expect(screen.getByText(/Error: Timeout/)).toBeInTheDocument();
  });

  it('renders Cheesefork link', () => {
    render(<FetchDataTab />);
    expect(screen.getByText(/Get ICS link from Cheesefork/)).toBeInTheDocument();
  });
});
