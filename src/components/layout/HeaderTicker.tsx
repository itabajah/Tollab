import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { useTickerMessages } from '@/hooks/useTickerMessages';
import type { TickerMessage } from '@/hooks/useTickerMessages';

const ROTATION_INTERVAL_MS = 8_000;

// ---------------------------------------------------------------------------
// HeaderTicker component
// ---------------------------------------------------------------------------

/**
 * Crossfade ticker bar that alternates between two overlapping `<span>`s.
 *
 * Messages are supplied by `useTickerMessages()` which analyses the current
 * semester state (classes, homework, exams, recordings, time-of-day) and
 * returns a priority-ordered list of resolved strings.
 */
export function HeaderTicker() {
  const messages = useTickerMessages();

  const [activeSlot, setActiveSlot] = useState<'a' | 'b'>('a');
  const [messageIndex, setMessageIndex] = useState(0);

  const textARef = useRef<HTMLSpanElement>(null);
  const textBRef = useRef<HTMLSpanElement>(null);

  // Keep a ref to the latest messages so the interval callback always reads
  // the freshest data without restarting the timer.
  const messagesRef = useRef<TickerMessage[]>(messages);
  messagesRef.current = messages;

  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;

  // Set initial text on mount / when messages change
  useEffect(() => {
    const first = messages[0];
    if (!first) return;
    const el = activeSlotRef.current === 'a' ? textARef.current : textBRef.current;
    if (el) el.textContent = first.text;
  }, [messages]);

  const rotate = useCallback(() => {
    setMessageIndex((prev) => {
      const msgs = messagesRef.current;
      if (msgs.length <= 1) return prev;
      const next = (prev + 1) % msgs.length;
      const nextMsg = msgs[next];

      const slot = activeSlotRef.current;
      const incoming = slot === 'a' ? textBRef : textARef;
      if (incoming.current && nextMsg) {
        incoming.current.textContent = nextMsg.text;
      }
      setActiveSlot((s) => (s === 'a' ? 'b' : 'a'));
      return next;
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(rotate, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [rotate]);

  const currentMessage = messages[messageIndex];
  const badge = currentMessage?.badge ?? 'INFO';

  const slotClassA = `header-ticker-text${activeSlot === 'a' ? ' is-active' : ' is-exiting'}`;
  const slotClassB = `header-ticker-text${activeSlot === 'b' ? ' is-active' : ' is-exiting'}`;

  return (
    <div
      id="header-ticker"
      class="event-card header-ticker"
      role="status"
      aria-live="polite"
    >
      <span id="header-ticker-badge" class="recordings-tab-count">
        {badge}
      </span>
      <div class="header-ticker-viewport" aria-hidden="true">
        <span
          id="header-ticker-text-a"
          class={slotClassA}
          ref={textARef}
        />
        <span
          id="header-ticker-text-b"
          class={slotClassB}
          ref={textBRef}
        />
      </div>
    </div>
  );
}
