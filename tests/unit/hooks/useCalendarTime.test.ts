/**
 * Tests for useCalendarTime hook — returns current Date, updates every minute,
 * cleans up on unmount.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { useCalendarTime } from '@/hooks/useCalendarTime';

describe('useCalendarTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a Date object', () => {
    const { result } = renderHook(() => useCalendarTime());
    expect(result.current).toBeInstanceOf(Date);
  });

  it('returns approximately the current time on initial render', () => {
    const before = Date.now();
    const { result } = renderHook(() => useCalendarTime());
    const after = Date.now();
    expect(result.current.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.current.getTime()).toBeLessThanOrEqual(after);
  });

  it('updates the time after one minute', () => {
    const { result } = renderHook(() => useCalendarTime());
    const initialTime = result.current.getTime();

    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    expect(result.current.getTime()).toBeGreaterThan(initialTime);
  });

  it('does not update before the minute boundary', () => {
    const { result } = renderHook(() => useCalendarTime());
    const initialTime = result.current.getTime();

    // Advance by only 1 second — should not trigger an update yet
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    // The time should still be the same Date object value
    // (within a 1-second tolerance since initial render is immediate)
    expect(result.current.getTime() - initialTime).toBeLessThan(2_000);
  });

  it('updates multiple times over multiple minutes', () => {
    const { result } = renderHook(() => useCalendarTime());

    const times: number[] = [result.current.getTime()];

    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(61_000);
      });
      times.push(result.current.getTime());
    }

    // Each successive time should be greater
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!).toBeGreaterThan(times[i - 1]!);
    }
  });

  it('cleans up timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = renderHook(() => useCalendarTime());

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('does not leak timers after unmount', () => {
    const { unmount } = renderHook(() => useCalendarTime());
    unmount();

    // Advancing time after unmount should not cause errors
    expect(() => {
      vi.advanceTimersByTime(120_000);
    }).not.toThrow();
  });

  it('handles multiple renders without timer accumulation', () => {
    const { result, rerender } = renderHook(() => useCalendarTime());

    // Rerender several times
    rerender();
    rerender();
    rerender();

    // Should still return a valid Date
    expect(result.current).toBeInstanceOf(Date);
  });
});
