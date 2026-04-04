import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

// ---------------------------------------------------------------------------
// Placeholder messages (Wave 9 will replace with full ticker engine)
// ---------------------------------------------------------------------------

const PLACEHOLDER_MESSAGES: readonly string[] = [
  'Welcome to Tollab — your academic companion.',
  'Add a semester to get started.',
  'Stay on top of homework and lectures.',
];

const ROTATION_INTERVAL_MS = 6_000;

// ---------------------------------------------------------------------------
// HeaderTicker component
// ---------------------------------------------------------------------------

/**
 * Crossfade ticker bar that alternates between two overlapping <span>s.
 *
 * Wave 9 will wire this to `buildHeaderTickerItems()` from the ticker engine.
 * For now we rotate through a small set of static messages.
 */
export function HeaderTicker() {
  const [activeSlot, setActiveSlot] = useState<'a' | 'b'>('a');
  const [, setMessageIndex] = useState(0);

  // Refs to track the text content of each slot independently
  const textARef = useRef<HTMLSpanElement>(null);
  const textBRef = useRef<HTMLSpanElement>(null);

  // Set initial text on mount
  useEffect(() => {
    const el = textARef.current;
    if (el) el.textContent = PLACEHOLDER_MESSAGES[0] ?? '';
  }, []);

  const rotate = useCallback(() => {
    setMessageIndex((prev) => {
      const next = (prev + 1) % PLACEHOLDER_MESSAGES.length;
      const incoming = activeSlot === 'a' ? textBRef : textARef;
      if (incoming.current) {
        incoming.current.textContent = PLACEHOLDER_MESSAGES[next] ?? '';
      }
      setActiveSlot((slot) => (slot === 'a' ? 'b' : 'a'));
      return next;
    });
  }, [activeSlot]);

  useEffect(() => {
    const id = window.setInterval(rotate, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [rotate]);

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
        INFO
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
