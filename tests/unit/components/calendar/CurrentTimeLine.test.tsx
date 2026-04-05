/**
 * Tests for CurrentTimeLine component and useTimeLineCell hook.
 */

import { render } from '@testing-library/preact';
import { renderHook, act } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CurrentTimeLine, useTimeLineCell } from '@/components/calendar/CurrentTimeLine';
import type { CalendarSettings } from '@/types';

const defaultSettings: CalendarSettings = {
  startHour: 8,
  endHour: 18,
  visibleDays: [0, 1, 2, 3, 4, 5],
};

describe('CurrentTimeLine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the line when current time is in visible range', () => {
    // Wednesday at 10:30
    vi.setSystemTime(new Date(2025, 5, 18, 10, 30));
    const { container } = render(<CurrentTimeLine settings={defaultSettings} />);
    expect(container.querySelector('.current-time-line')).toBeTruthy();
  });

  it('returns null when current day is not visible', () => {
    // Saturday (day 6) - not in visibleDays [0..5]
    vi.setSystemTime(new Date(2025, 5, 21, 10, 30));
    const settings: CalendarSettings = { ...defaultSettings, visibleDays: [1, 2, 3, 4, 5] };
    const { container } = render(<CurrentTimeLine settings={settings} />);
    expect(container.querySelector('.current-time-line')).toBeNull();
  });

  it('returns null when current hour is before startHour', () => {
    // 6:00 AM, before startHour 8
    vi.setSystemTime(new Date(2025, 5, 18, 6, 0));
    const { container } = render(<CurrentTimeLine settings={defaultSettings} />);
    expect(container.querySelector('.current-time-line')).toBeNull();
  });

  it('returns null when current hour is after endHour', () => {
    // 20:00, after endHour 18
    vi.setSystemTime(new Date(2025, 5, 18, 20, 0));
    const { container } = render(<CurrentTimeLine settings={defaultSettings} />);
    expect(container.querySelector('.current-time-line')).toBeNull();
  });

  it('positions line based on minute (50%)', () => {
    // 10:30 → 30/60 * 100 = 50%
    vi.setSystemTime(new Date(2025, 5, 18, 10, 30));
    const { container } = render(<CurrentTimeLine settings={defaultSettings} />);
    const line = container.querySelector('.current-time-line') as HTMLElement;
    expect(line.style.top).toBe('50%');
  });

  it('positions line at 0% for minute 0', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 10, 0));
    const { container } = render(<CurrentTimeLine settings={defaultSettings} />);
    const line = container.querySelector('.current-time-line') as HTMLElement;
    expect(line.style.top).toBe('0%');
  });

  it('positions line at 75% for minute 45', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 10, 45));
    const { container } = render(<CurrentTimeLine settings={defaultSettings} />);
    const line = container.querySelector('.current-time-line') as HTMLElement;
    expect(line.style.top).toContain('75');
  });

  it('respects visibleDaysOverride', () => {
    // Wednesday = day 3, only show Monday
    vi.setSystemTime(new Date(2025, 5, 18, 10, 30));
    const { container } = render(
      <CurrentTimeLine settings={defaultSettings} visibleDaysOverride={[1]} />,
    );
    expect(container.querySelector('.current-time-line')).toBeNull();
  });

  it('updates on interval tick', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 10, 0));
    const { container } = render(<CurrentTimeLine settings={defaultSettings} />);

    const line1 = container.querySelector('.current-time-line') as HTMLElement;
    expect(line1).toBeTruthy();
    expect(line1.style.top).toBe('0%');

    // After advancing by 60 seconds, the interval fires and re-reads Date.
    // The component should still render (possibly with updated position).
    vi.setSystemTime(new Date(2025, 5, 18, 10, 45));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    const line2 = container.querySelector('.current-time-line') as HTMLElement;
    expect(line2).toBeTruthy();
    // Verify it changed from 0%
    expect(line2.style.top).not.toBe('0%');
  });
});

describe('useTimeLineCell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns day and hour when in range', () => {
    // Wednesday (3) at 10:00
    vi.setSystemTime(new Date(2025, 5, 18, 10, 30));
    const { result } = renderHook(() => useTimeLineCell(defaultSettings));
    expect(result.current).toEqual({ day: 3, hour: 10 });
  });

  it('returns null when outside visible days', () => {
    // Saturday (6) not in visibleDays
    vi.setSystemTime(new Date(2025, 5, 21, 10, 30));
    const settings: CalendarSettings = { ...defaultSettings, visibleDays: [1, 2, 3, 4, 5] };
    const { result } = renderHook(() => useTimeLineCell(settings));
    expect(result.current).toBeNull();
  });

  it('returns null when before startHour', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 6, 0));
    const { result } = renderHook(() => useTimeLineCell(defaultSettings));
    expect(result.current).toBeNull();
  });

  it('returns null when after endHour', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 20, 0));
    const { result } = renderHook(() => useTimeLineCell(defaultSettings));
    expect(result.current).toBeNull();
  });

  it('respects visibleDaysOverride', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 10, 30));
    const { result } = renderHook(() => useTimeLineCell(defaultSettings, [1]));
    expect(result.current).toBeNull();
  });
});
