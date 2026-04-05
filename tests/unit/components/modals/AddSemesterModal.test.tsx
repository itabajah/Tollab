import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddSemester = vi.fn().mockReturnValue('new-semester-id');
const mockSetCurrentSemester = vi.fn();
const mockPopModal = vi.fn();

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ addSemester: mockAddSemester, setCurrentSemester: mockSetCurrentSemester }),
}));

vi.mock('@/store/ui-store', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ modalStack: ['add-semester'], popModal: mockPopModal }),
}));

vi.mock('@/components/modals/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: preact.ComponentChildren; title: string }) =>
    isOpen ? <div data-testid="modal"><h2>{title}</h2>{children}</div> : null,
}));

import { AddSemesterModal } from '@/components/modals/AddSemesterModal';

describe('AddSemesterModal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders when modal is open', () => {
    render(<AddSemesterModal />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Add Semester')).toBeInTheDocument();
  });

  it('renders the preset dropdown', () => {
    render(<AddSemesterModal />);
    expect(screen.getByLabelText('Select Semester')).toBeInTheDocument();
  });

  it('renders preset options including Custom...', () => {
    render(<AddSemesterModal />);
    const select = screen.getByLabelText('Select Semester');
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(10); // 3 seasons x 3 years + 1 custom
    expect(options[options.length - 1]).toHaveTextContent('Custom...');
  });

  it('renders Create Semester button', () => {
    render(<AddSemesterModal />);
    expect(screen.getByRole('button', { name: 'Create Semester' })).toBeInTheDocument();
  });

  it('submits with preset value', () => {
    render(<AddSemesterModal />);
    const form = screen.getByRole('button', { name: 'Create Semester' }).closest('form')!;
    fireEvent.submit(form);
    expect(mockAddSemester).toHaveBeenCalled();
    expect(mockSetCurrentSemester).toHaveBeenCalledWith('new-semester-id');
    expect(mockPopModal).toHaveBeenCalled();
  });

  it('shows custom name input when Custom... is selected', () => {
    render(<AddSemesterModal />);
    fireEvent.change(screen.getByLabelText('Select Semester'), { target: { value: 'custom' } });
    expect(screen.getByLabelText('Custom Name')).toBeInTheDocument();
  });

  it('hides custom name input when switching back to preset', () => {
    render(<AddSemesterModal />);
    fireEvent.change(screen.getByLabelText('Select Semester'), { target: { value: 'custom' } });
    expect(screen.getByLabelText('Custom Name')).toBeInTheDocument();
    const firstPreset = screen.getByLabelText('Select Semester').querySelector('option')!;
    fireEvent.change(screen.getByLabelText('Select Semester'), { target: { value: firstPreset.value } });
    expect(screen.queryByLabelText('Custom Name')).not.toBeInTheDocument();
  });

  it('submits with custom name', () => {
    render(<AddSemesterModal />);
    fireEvent.change(screen.getByLabelText('Select Semester'), { target: { value: 'custom' } });
    fireEvent.input(screen.getByLabelText('Custom Name'), { target: { value: 'Special Term' } });
    const form = screen.getByRole('button', { name: 'Create Semester' }).closest('form')!;
    fireEvent.submit(form);
    expect(mockAddSemester).toHaveBeenCalledWith('Special Term');
  });

  it('shows error when custom name is empty', () => {
    render(<AddSemesterModal />);
    fireEvent.change(screen.getByLabelText('Select Semester'), { target: { value: 'custom' } });
    const form = screen.getByRole('button', { name: 'Create Semester' }).closest('form')!;
    fireEvent.submit(form);
    expect(screen.getByText('Semester name cannot be empty.')).toBeInTheDocument();
    expect(mockAddSemester).not.toHaveBeenCalled();
  });

  it('shows error when custom name exceeds 50 characters', () => {
    render(<AddSemesterModal />);
    fireEvent.change(screen.getByLabelText('Select Semester'), { target: { value: 'custom' } });
    fireEvent.input(screen.getByLabelText('Custom Name'), { target: { value: 'A'.repeat(51) } });
    const form = screen.getByRole('button', { name: 'Create Semester' }).closest('form')!;
    fireEvent.submit(form);
    expect(screen.getByText('Name must be 50 characters or fewer.')).toBeInTheDocument();
    expect(mockAddSemester).not.toHaveBeenCalled();
  });

  it('clears error when user types in custom input', () => {
    render(<AddSemesterModal />);
    fireEvent.change(screen.getByLabelText('Select Semester'), { target: { value: 'custom' } });
    const form = screen.getByRole('button', { name: 'Create Semester' }).closest('form')!;
    fireEvent.submit(form);
    expect(screen.getByText('Semester name cannot be empty.')).toBeInTheDocument();
    fireEvent.input(screen.getByLabelText('Custom Name'), { target: { value: 'X' } });
    expect(screen.queryByText('Semester name cannot be empty.')).not.toBeInTheDocument();
  });

  it('clears error when switching to preset', () => {
    render(<AddSemesterModal />);
    fireEvent.change(screen.getByLabelText('Select Semester'), { target: { value: 'custom' } });
    const form = screen.getByRole('button', { name: 'Create Semester' }).closest('form')!;
    fireEvent.submit(form);
    expect(screen.getByText('Semester name cannot be empty.')).toBeInTheDocument();
    const firstPreset = screen.getByLabelText('Select Semester').querySelector('option')!;
    fireEvent.change(screen.getByLabelText('Select Semester'), { target: { value: firstPreset.value } });
    expect(screen.queryByText('Semester name cannot be empty.')).not.toBeInTheDocument();
  });
});