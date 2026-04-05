import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpdateHomework = vi.fn();

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ updateHomework: mockUpdateHomework }),
}));

vi.mock('@/utils/dom', () => ({
  getInputValue: (e: Event) => (e.currentTarget as HTMLInputElement).value,
  getTextAreaValue: (e: Event) => (e.currentTarget as HTMLTextAreaElement).value,
}));

vi.mock('@/utils/validation', () => ({
  validateUrl: (url: string) => ({ valid: url.startsWith('http') }),
}));

import { HomeworkEditor } from '@/components/homework/HomeworkEditor';
import type { HomeworkLink } from '@/types';

const defaultProps = {
  courseId: 'c1',
  homeworkIndex: 0,
  title: 'HW 1',
  dueDate: '2025-06-15',
  notes: 'Some notes',
  links: [] as HomeworkLink[],
  onClose: vi.fn(),
};

describe('HomeworkEditor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crash', () => {
    render(<HomeworkEditor {...defaultProps} />);
    expect(screen.getByDisplayValue('HW 1')).toBeInTheDocument();
  });

  it('renders title, due date, notes fields', () => {
    render(<HomeworkEditor {...defaultProps} />);
    expect(screen.getByDisplayValue('HW 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-06-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Some notes')).toBeInTheDocument();
  });

  it('renders Save and Cancel buttons', () => {
    render(<HomeworkEditor {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders links label', () => {
    render(<HomeworkEditor {...defaultProps} />);
    expect(screen.getByText('Links:')).toBeInTheDocument();
  });

  it('allows editing the title', () => {
    render(<HomeworkEditor {...defaultProps} />);
    const input = screen.getByDisplayValue('HW 1');
    fireEvent.input(input, { target: { value: 'HW 2' } });
    expect(input).toHaveValue('HW 2');
  });

  it('allows editing the due date', () => {
    render(<HomeworkEditor {...defaultProps} />);
    const input = screen.getByDisplayValue('2025-06-15');
    fireEvent.input(input, { target: { value: '2025-07-01' } });
    expect(input).toHaveValue('2025-07-01');
  });

  it('allows editing the notes', () => {
    render(<HomeworkEditor {...defaultProps} />);
    const textarea = screen.getByDisplayValue('Some notes');
    fireEvent.input(textarea, { target: { value: 'Updated notes' } });
    expect(textarea).toHaveValue('Updated notes');
  });

  it('calls updateHomework and onClose on save', () => {
    const onClose = vi.fn();
    render(<HomeworkEditor {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockUpdateHomework).toHaveBeenCalledWith('c1', 0, {
      title: 'HW 1', dueDate: '2025-06-15', notes: 'Some notes', links: [],
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('falls back to original title when title is empty on save', () => {
    render(<HomeworkEditor {...defaultProps} />);
    fireEvent.input(screen.getByDisplayValue('HW 1'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockUpdateHomework).toHaveBeenCalledWith('c1', 0, expect.objectContaining({ title: 'HW 1' }));
  });

  it('calls onClose on cancel without updating', () => {
    const onClose = vi.fn();
    render(<HomeworkEditor {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockUpdateHomework).not.toHaveBeenCalled();
  });

  it('renders add link inputs', () => {
    render(<HomeworkEditor {...defaultProps} />);
    expect(screen.getByPlaceholderText('Paste URL...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Label (auto)')).toBeInTheDocument();
  });

  it('adds a link when URL is valid and Add is clicked', () => {
    render(<HomeworkEditor {...defaultProps} />);
    fireEvent.input(screen.getByPlaceholderText('Paste URL...'), { target: { value: 'https://example.com' } });
    fireEvent.input(screen.getByPlaceholderText('Label (auto)'), { target: { value: 'Example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Example')).toBeInTheDocument();
  });

  it('adds a link on Enter in URL input', () => {
    render(<HomeworkEditor {...defaultProps} />);
    const urlInput = screen.getByPlaceholderText('Paste URL...');
    fireEvent.input(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.keyDown(urlInput, { key: 'Enter' });
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('does not add link with invalid URL', () => {
    render(<HomeworkEditor {...defaultProps} />);
    fireEvent.input(screen.getByPlaceholderText('Paste URL...'), { target: { value: 'not-url' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.queryByText('not-url')).not.toBeInTheDocument();
  });

  it('does not add link with empty URL', () => {
    render(<HomeworkEditor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.queryByLabelText('Remove link')).not.toBeInTheDocument();
  });

  it('removes a link when remove button is clicked', () => {
    const links: HomeworkLink[] = [{ label: 'Docs', url: 'https://docs.com' }];
    render(<HomeworkEditor {...defaultProps} links={links} />);
    expect(screen.getByText('Docs')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove link'));
    expect(screen.queryByText('Docs')).not.toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', () => {
    const links: HomeworkLink[] = [{ label: 'Docs', url: 'https://docs.com' }];
    render(<HomeworkEditor {...defaultProps} links={links} />);
    fireEvent.click(screen.getByLabelText('Edit link'));
    expect(screen.getByDisplayValue('Docs')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://docs.com')).toBeInTheDocument();
  });

  it('saves edited link', () => {
    const links: HomeworkLink[] = [{ label: 'Docs', url: 'https://docs.com' }];
    render(<HomeworkEditor {...defaultProps} links={links} />);
    fireEvent.click(screen.getByLabelText('Edit link'));
    fireEvent.input(screen.getByDisplayValue('Docs'), { target: { value: 'New Docs' } });
    fireEvent.click(screen.getByRole('button', { name: /✓/ }));
    expect(screen.getByText('New Docs')).toBeInTheDocument();
  });

  it('cancels editing a link', () => {
    const links: HomeworkLink[] = [{ label: 'Docs', url: 'https://docs.com' }];
    render(<HomeworkEditor {...defaultProps} links={links} />);
    fireEvent.click(screen.getByLabelText('Edit link'));
    fireEvent.click(screen.getByRole('button', { name: /✕/ }));
    expect(screen.getByText('Docs')).toBeInTheDocument();
  });

  it('saves links along with other fields', () => {
    const links: HomeworkLink[] = [{ label: 'L', url: 'https://l.com' }];
    render(<HomeworkEditor {...defaultProps} links={links} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockUpdateHomework).toHaveBeenCalledWith('c1', 0, expect.objectContaining({
      links: [{ label: 'L', url: 'https://l.com' }],
    }));
  });

  it('renders with empty initial values', () => {
    render(<HomeworkEditor {...defaultProps} title="" dueDate="" notes="" links={[]} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});