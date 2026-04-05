/**
 * Tests for TimeGrid component.
 */

import { render, screen } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';
import { TimeGrid } from '@/components/calendar/TimeGrid';
import type { CalendarSettings } from '@/types';

const defaultSettings: CalendarSettings = {
  startHour: 8,
  endHour: 12,
  visibleDays: [0, 1, 2, 3, 4],
};

describe('TimeGrid', () => {
  it('renders the grid container', () => {
    const { container } = render(<TimeGrid settings={defaultSettings} />);
    expect(container.querySelector('.weekly-schedule')).toBeTruthy();
  });

  it('renders day headers for visible days', () => {
    render(<TimeGrid settings={defaultSettings} />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.queryByText('Fri')).not.toBeInTheDocument();
    expect(screen.queryByText('Sat')).not.toBeInTheDocument();
  });

  it('renders time labels for each hour', () => {
    render(<TimeGrid settings={defaultSettings} />);
    expect(screen.getByText('8:00')).toBeInTheDocument();
    expect(screen.getByText('9:00')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('renders correct number of schedule cells', () => {
    const { container } = render(<TimeGrid settings={defaultSettings} />);
    const cells = container.querySelectorAll('.schedule-cell');
    // 5 hours (8-12 inclusive) × 5 days = 25 cells
    expect(cells).toHaveLength(25);
  });

  it('sets data-day and data-hour on cells', () => {
    const { container } = render(<TimeGrid settings={defaultSettings} />);
    const firstCell = container.querySelector('.schedule-cell')!;
    expect(firstCell.getAttribute('data-day')).toBe('0');
    expect(firstCell.getAttribute('data-hour')).toBe('8');
  });

  it('applies grid template columns based on visible days', () => {
    const { container } = render(<TimeGrid settings={defaultSettings} />);
    const grid = container.querySelector('.weekly-schedule') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('40px repeat(5, 1fr)');
  });

  it('respects visibleDaysOverride', () => {
    render(<TimeGrid settings={defaultSettings} visibleDaysOverride={[1, 3]} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.queryByText('Sun')).not.toBeInTheDocument();
    expect(screen.queryByText('Tue')).not.toBeInTheDocument();
  });

  it('calls cellContent for each cell', () => {
    const cellContent = vi.fn(() => null);
    render(<TimeGrid settings={defaultSettings} cellContent={cellContent} />);
    // 5 hours × 5 days = 25 calls
    expect(cellContent).toHaveBeenCalledTimes(25);
  });

  it('renders cellContent return value in cells', () => {
    const cellContent = (day: number, hour: number) =>
      day === 1 && hour === 9 ? <span data-testid="chip">Event</span> : null;
    render(<TimeGrid settings={defaultSettings} cellContent={cellContent} />);
    expect(screen.getByTestId('chip')).toBeInTheDocument();
  });

  it('handles single hour range', () => {
    const settings: CalendarSettings = { startHour: 10, endHour: 10, visibleDays: [0] };
    const { container } = render(<TimeGrid settings={settings} />);
    expect(container.querySelectorAll('.schedule-cell')).toHaveLength(1);
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('renders all 7 days when configured', () => {
    const settings: CalendarSettings = { startHour: 8, endHour: 8, visibleDays: [0, 1, 2, 3, 4, 5, 6] };
    render(<TimeGrid settings={settings} />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders corner header cell', () => {
    const { container } = render(<TimeGrid settings={defaultSettings} />);
    const headers = container.querySelectorAll('.schedule-header');
    // 1 corner + 5 day headers = 6
    expect(headers).toHaveLength(6);
  });
});
