/**
 * Tests for CalendarTab settings component.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpdateCalendarSettings = vi.fn();
let mockSemesters: { id: string; name: string; calendarSettings?: { startHour: number; endHour: number; visibleDays: number[] } }[] = [];
let mockCurrentSemesterId: string | null = null;

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      semesters: mockSemesters,
      currentSemesterId: mockCurrentSemesterId,
      updateCalendarSettings: mockUpdateCalendarSettings,
    }),
}));

vi.mock('@/constants', () => ({
  DAY_NAMES: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}));

vi.mock('@/utils/dom', () => ({
  getInputValue: (e: { target: { value: string } }) => e.target.value,
}));

import { CalendarTab } from '@/components/settings/CalendarTab';

describe('CalendarTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSemesters = [{
      id: 'sem-1',
      name: 'Winter 2025',
      calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
    }];
    mockCurrentSemesterId = 'sem-1';
  });

  it('shows message when no semester selected', () => {
    mockCurrentSemesterId = null;
    mockSemesters = [];
    render(<CalendarTab />);
    expect(screen.getByText(/No semester selected/)).toBeInTheDocument();
  });

  it('renders start hour input', () => {
    render(<CalendarTab />);
    expect(screen.getByLabelText('Start Hour (0-23)')).toBeInTheDocument();
  });

  it('renders end hour input', () => {
    render(<CalendarTab />);
    expect(screen.getByLabelText('End Hour (0-23)')).toBeInTheDocument();
  });

  it('shows current start hour value', () => {
    render(<CalendarTab />);
    const input = screen.getByLabelText('Start Hour (0-23)') as HTMLInputElement;
    expect(input.value).toBe('8');
  });

  it('shows current end hour value', () => {
    render(<CalendarTab />);
    const input = screen.getByLabelText('End Hour (0-23)') as HTMLInputElement;
    expect(input.value).toBe('20');
  });

  it('updates start hour on valid input', () => {
    render(<CalendarTab />);
    fireEvent.input(screen.getByLabelText('Start Hour (0-23)'), { target: { value: '10' } });
    expect(mockUpdateCalendarSettings).toHaveBeenCalledWith('sem-1', { startHour: 10 });
  });

  it('updates end hour on valid input', () => {
    render(<CalendarTab />);
    fireEvent.input(screen.getByLabelText('End Hour (0-23)'), { target: { value: '18' } });
    expect(mockUpdateCalendarSettings).toHaveBeenCalledWith('sem-1', { endHour: 18 });
  });

  it('ignores invalid start hour (NaN)', () => {
    render(<CalendarTab />);
    fireEvent.input(screen.getByLabelText('Start Hour (0-23)'), { target: { value: 'abc' } });
    expect(mockUpdateCalendarSettings).not.toHaveBeenCalled();
  });

  it('ignores out-of-range hour (>23)', () => {
    render(<CalendarTab />);
    fireEvent.input(screen.getByLabelText('Start Hour (0-23)'), { target: { value: '25' } });
    expect(mockUpdateCalendarSettings).not.toHaveBeenCalled();
  });

  it('ignores negative hour', () => {
    render(<CalendarTab />);
    fireEvent.input(screen.getByLabelText('Start Hour (0-23)'), { target: { value: '-1' } });
    expect(mockUpdateCalendarSettings).not.toHaveBeenCalled();
  });

  it('renders day checkboxes for all 7 days', () => {
    render(<CalendarTab />);
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });

  it('toggles day off when clicked', () => {
    render(<CalendarTab />);
    const sundayCheckbox = screen.getByText('Sunday').closest('label')!.querySelector('input')!;
    fireEvent.change(sundayCheckbox);
    expect(mockUpdateCalendarSettings).toHaveBeenCalledWith('sem-1', {
      visibleDays: [1, 2, 3, 4, 5],
    });
  });

  it('toggles day on when clicked', () => {
    render(<CalendarTab />);
    const saturdayCheckbox = screen.getByText('Saturday').closest('label')!.querySelector('input')!;
    fireEvent.change(saturdayCheckbox);
    expect(mockUpdateCalendarSettings).toHaveBeenCalledWith('sem-1', {
      visibleDays: [0, 1, 2, 3, 4, 5, 6],
    });
  });

  it('prevents unchecking last visible day', () => {
    mockSemesters = [{
      id: 'sem-1',
      name: 'Winter 2025',
      calendarSettings: { startHour: 8, endHour: 20, visibleDays: [1] },
    }];
    render(<CalendarTab />);
    const mondayCheckbox = screen.getByText('Monday').closest('label')!.querySelector('input')!;
    fireEvent.change(mondayCheckbox);
    expect(mockUpdateCalendarSettings).not.toHaveBeenCalled();
  });

  it('uses default settings when no calendarSettings on semester', () => {
    mockSemesters = [{ id: 'sem-1', name: 'Winter 2025' }];
    render(<CalendarTab />);
    const input = screen.getByLabelText('Start Hour (0-23)') as HTMLInputElement;
    expect(input.value).toBe('8');
  });

  it('renders section title', () => {
    render(<CalendarTab />);
    expect(screen.getByText('Calendar Configuration')).toBeInTheDocument();
  });
});
