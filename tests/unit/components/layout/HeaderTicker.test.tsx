import { render, screen, act } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let mockMessages: { text: string; badge?: string }[] = [];

vi.mock('@/hooks/useTickerMessages', () => ({
  useTickerMessages: () => mockMessages,
}));

import { HeaderTicker } from '@/components/layout/HeaderTicker';

describe('HeaderTicker', () => {
  beforeEach(() => { vi.useFakeTimers(); mockMessages = []; });
  afterEach(() => { vi.useRealTimers(); });

  it('returns null when no messages', () => {
    const { container } = render(<HeaderTicker />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a single message', () => {
    mockMessages = [{ text: 'Welcome back!', badge: 'HI' }];
    render(<HeaderTicker />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('HI')).toBeInTheDocument();
  });

  it('defaults badge to INFO when not provided', () => {
    mockMessages = [{ text: 'Hello' }];
    render(<HeaderTicker />);
    expect(screen.getByText('INFO')).toBeInTheDocument();
  });

  it('has role="status" and aria-live="polite"', () => {
    mockMessages = [{ text: 'Message' }];
    render(<HeaderTicker />);
    const ticker = screen.getByRole('status');
    expect(ticker).toHaveAttribute('aria-live', 'polite');
  });

  it('has the header-ticker class', () => {
    mockMessages = [{ text: 'Message' }];
    render(<HeaderTicker />);
    expect(screen.getByRole('status')).toHaveClass('header-ticker');
  });

  it('renders two text slots (a and b)', () => {
    mockMessages = [{ text: 'Msg1' }, { text: 'Msg2' }];
    render(<HeaderTicker />);
    const ticker = screen.getByRole('status');
    expect(ticker.querySelector('#header-ticker-text-a')).toBeInTheDocument();
    expect(ticker.querySelector('#header-ticker-text-b')).toBeInTheDocument();
  });

  it('slot a is active initially', () => {
    mockMessages = [{ text: 'Msg1' }, { text: 'Msg2' }];
    render(<HeaderTicker />);
    const slotA = screen.getByRole('status').querySelector('#header-ticker-text-a');
    expect(slotA?.className).toContain('is-active');
  });

  it('rotates to next message after interval', () => {
    mockMessages = [{ text: 'First' }, { text: 'Second' }];
    render(<HeaderTicker />);
    const ticker = screen.getByRole('status');
    const slotA = ticker.querySelector('#header-ticker-text-a');
    expect(slotA?.textContent).toBe('First');
    act(() => { vi.advanceTimersByTime(8000); });
    const slotB = ticker.querySelector('#header-ticker-text-b');
    expect(slotB?.textContent).toBe('Second');
  });

  it('does not rotate when there is only one message', () => {
    mockMessages = [{ text: 'Only' }];
    render(<HeaderTicker />);
    const slotA = screen.getByRole('status').querySelector('#header-ticker-text-a');
    expect(slotA?.textContent).toBe('Only');
    act(() => { vi.advanceTimersByTime(16000); });
    expect(slotA?.textContent).toBe('Only');
  });

  it('viewport div is aria-hidden', () => {
    mockMessages = [{ text: 'Msg' }];
    render(<HeaderTicker />);
    const viewport = screen.getByRole('status').querySelector('.header-ticker-viewport');
    expect(viewport).toHaveAttribute('aria-hidden', 'true');
  });
});