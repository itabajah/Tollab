/**
 * Hook for calendar current-time-line updates.
 *
 * Returns the current Date, refreshing every 60 seconds so the calendar's
 * "now" indicator moves in real time without manual polling.
 */

import { useEffect, useState } from 'preact/hooks';

/** Milliseconds until the next full minute boundary. */
function msUntilNextMinute(): number {
  const now = new Date();
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
}

/**
 * Returns the current `Date`, auto-refreshing every minute on the
 * minute boundary (aligned to :00 seconds for smooth calendar updates).
 */
export function useCalendarTime(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function tick(): void {
      setNow(new Date());
      // Schedule the next tick at the next minute boundary
      timer = setTimeout(tick, msUntilNextMinute());
    }

    // First tick aligned to the next minute
    timer = setTimeout(tick, msUntilNextMinute());

    return () => clearTimeout(timer);
  }, []);

  return now;
}
