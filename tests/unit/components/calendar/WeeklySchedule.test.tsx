/**
 * Tests for WeeklySchedule component.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockCurrentSemester = vi.fn();
const mockUseAppStore = vi.fn();
const mockUseTimeLineCell = vi.fn();

vi.mock('@/store/selectors', () => ({
  useCurrentSemester: () => mockCurrentSemester(),
}));

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: unknown) => unknown) => mockUseAppStore(selector),
}));

vi.mock('@/components/calendar/CurrentTimeLine', () => ({
  CurrentTimeLine: () => <div data-testid="current-time-line" />,
  useTimeLineCell: () => mockUseTimeLineCell(),
}));

vi.mock('@/components/calendar/EventChip', () => ({
  EventChip: ({ course }: { course: { name: string } }) => (
    <div data-testid="event-chip">{course.name}</div>
  ),
}));

vi.mock('@/components/calendar/TimeGrid', () => ({
  TimeGrid: ({
    cellContent,
    settings,
    visibleDaysOverride,
  }: {
    settings: { startHour: number; endHour: number; visibleDays: number[] };
    visibleDaysOverride?: number[];
    cellContent?: (day: number, hour: number) => unknown;
  }) => {
    const days = visibleDaysOverride ?? settings.visibleDays;
    return (
      <div data-testid="time-grid">
        {days.map((d: number) =>
          Array.from({ length: settings.endHour - settings.startHour + 1 }, (_, i) => {
            const h = settings.startHour + i;
            return (
              <div key={`${d}-${h}`} data-testid={`cell-${d}-${h}`}>
                {cellContent?.(d, h) as import('preact').ComponentChildren}
              </div>
            );
          }),
        )}
      </div>
    );
  },
}));

vi.mock('@/constants/ui', () => ({
  MOBILE_BREAKPOINT: 768,
}));

vi.mock('@/types', () => ({
  DEFAULT_CALENDAR_SETTINGS: {
    startHour: 8,
    endHour: 18,
    visibleDays: [0, 1, 2, 3, 4, 5],
  },
}));

import { WeeklySchedule } from '@/components/calendar/WeeklySchedule';

describe('WeeklySchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentSemester.mockReturnValue({
      id: 'sem-1',
      name: 'Winter 2025',
      calendarSettings: {
        startHour: 8,
        endHour: 18,
        visibleDays: [0, 1, 2, 3, 4, 5],
      },
    });
    mockUseAppStore.mockReturnValue([]);
    mockUseTimeLineCell.mockReturnValue(null);
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the schedule title', () => {
    render(<WeeklySchedule />);
    expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
  });

  it('shows "No classes scheduled" placeholder when no courses', () => {
    mockUseAppStore.mockReturnValue([]);
    render(<WeeklySchedule />);
    expect(screen.getByText('No classes scheduled.')).toBeInTheDocument();
  });

  it('renders TimeGrid when courses have schedule slots', () => {
    mockUseAppStore.mockReturnValue([
      {
        id: 'c1',
        name: 'Math',
        color: '#ff0000',
        schedule: [{ day: 1, start: '10:00', end: '11:00' }],
      },
    ]);
    render(<WeeklySchedule />);
    expect(screen.getByTestId('time-grid')).toBeInTheDocument();
  });

  it('renders toggle day button', () => {
    render(<WeeklySchedule />);
    expect(screen.getByTitle('Toggle Single Day View')).toBeInTheDocument();
  });

  it('toggles between All Days and Today on button click', () => {
    render(<WeeklySchedule />);
    const toggle = screen.getByTitle('Toggle Single Day View');
    expect(screen.getByText('All Days')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText('Today')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText('All Days')).toBeInTheDocument();
  });

  it('renders collapse calendar button', () => {
    render(<WeeklySchedule />);
    expect(screen.getByTitle('Toggle Calendar')).toBeInTheDocument();
  });

  it('collapses calendar on toggle click', () => {
    mockUseAppStore.mockReturnValue([
      {
        id: 'c1',
        name: 'Math',
        color: '#ff0000',
        schedule: [{ day: 1, start: '10:00', end: '11:00' }],
      },
    ]);
    render(<WeeklySchedule />);
    expect(screen.getByTestId('time-grid')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Toggle Calendar'));
    expect(screen.queryByTestId('time-grid')).not.toBeInTheDocument();
  });

  it('uses default settings when no semester', () => {
    mockCurrentSemester.mockReturnValue(undefined);
    render(<WeeklySchedule />);
    // Should still render without crashing
    expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
  });
});
