import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetCurrentSemester = vi.fn();
const mockDeleteSemester = vi.fn();
const mockPushModal = vi.fn();

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      semesters: [{ id: 's1', name: 'Winter 2024-2025' }, { id: 's2', name: 'Spring 2025' }],
      currentSemesterId: 's1',
      setCurrentSemester: mockSetCurrentSemester,
      deleteSemester: mockDeleteSemester,
    }),
}));

vi.mock('@/store/selectors', () => ({
  useCurrentSemester: () => ({ id: 's1', name: 'Winter 2024-2025' }),
}));

vi.mock('@/store/ui-store', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ pushModal: mockPushModal }),
}));

import { SemesterControls } from '@/components/layout/SemesterControls';

describe('SemesterControls', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crash', () => {
    render(<SemesterControls />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders semester options in dropdown', () => {
    render(<SemesterControls />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Winter 2024-2025');
    expect(options[1]).toHaveTextContent('Spring 2025');
  });

  it('selects the current semester', () => {
    render(<SemesterControls />);
    expect(screen.getByRole('combobox')).toHaveValue('s1');
  });

  it('renders add and delete buttons', () => {
    render(<SemesterControls />);
    expect(screen.getByTitle('Add Semester')).toBeInTheDocument();
    expect(screen.getByTitle('Delete Current Semester')).toBeInTheDocument();
  });

  it('calls setCurrentSemester on dropdown change', () => {
    render(<SemesterControls />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 's2' } });
    expect(mockSetCurrentSemester).toHaveBeenCalledWith('s2');
  });

  it('pushes add-semester modal on add button click', () => {
    render(<SemesterControls />);
    fireEvent.click(screen.getByTitle('Add Semester'));
    expect(mockPushModal).toHaveBeenCalledWith('add-semester');
  });

  it('shows confirm dialog on delete and deletes on confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SemesterControls />);
    fireEvent.click(screen.getByTitle('Delete Current Semester'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteSemester).toHaveBeenCalledWith('s1');
    confirmSpy.mockRestore();
  });

  it('does not delete when confirm is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SemesterControls />);
    fireEvent.click(screen.getByTitle('Delete Current Semester'));
    expect(mockDeleteSemester).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});