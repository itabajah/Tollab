/**
 * Tests for useFocusTrap hook.
 */

import { renderHook, act } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFocusTrap } from '@/components/modals/useFocusTrap';
import type { RefObject } from 'preact';

function createMockContainer(elements: HTMLElement[]): RefObject<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  elements.forEach((el) => container.appendChild(el));
  return { current: container };
}

function createButton(id: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = id;
  btn.textContent = id;
  return btn;
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
    // Clear the body
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('sets body overflow to hidden when open', () => {
    const containerRef = createMockContainer([createButton('btn1')]);
    renderHook(() => useFocusTrap(containerRef, true));
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('does not set overflow when closed', () => {
    const containerRef = createMockContainer([createButton('btn1')]);
    renderHook(() => useFocusTrap(containerRef, false));
    expect(document.body.style.overflow).toBe('');
  });

  it('restores overflow on cleanup', () => {
    const containerRef = createMockContainer([createButton('btn1')]);
    const { unmount } = renderHook(() => useFocusTrap(containerRef, true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('saves and restores previous focus', () => {
    const previousBtn = createButton('previous');
    document.body.appendChild(previousBtn);
    previousBtn.focus();

    const containerRef = createMockContainer([createButton('btn1')]);
    const { unmount } = renderHook(() => useFocusTrap(containerRef, true));
    unmount();
    expect(document.activeElement).toBe(previousBtn);
  });

  it('handleTabKey wraps forward from last to first', () => {
    const btn1 = createButton('first');
    const btn2 = createButton('last');
    const containerRef = createMockContainer([btn1, btn2]);

    const { result } = renderHook(() => useFocusTrap(containerRef, true));

    // Focus on last element
    btn2.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    Object.defineProperty(event, 'shiftKey', { value: false });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    act(() => {
      result.current.handleTabKey(event);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(btn1);
  });

  it('handleTabKey wraps backward from first to last', () => {
    const btn1 = createButton('first');
    const btn2 = createButton('last');
    const containerRef = createMockContainer([btn1, btn2]);

    const { result } = renderHook(() => useFocusTrap(containerRef, true));

    // Focus on first element
    btn1.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, shiftKey: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    act(() => {
      result.current.handleTabKey(event);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(btn2);
  });

  it('handleTabKey ignores non-Tab keys', () => {
    const btn1 = createButton('btn1');
    const containerRef = createMockContainer([btn1]);

    const { result } = renderHook(() => useFocusTrap(containerRef, true));

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    act(() => {
      result.current.handleTabKey(event);
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('handleTabKey handles empty container', () => {
    const containerRef = createMockContainer([]);
    const { result } = renderHook(() => useFocusTrap(containerRef, true));

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    // Should not throw
    act(() => {
      result.current.handleTabKey(event);
    });
  });

  it('handleTabKey does nothing when not wrapping', () => {
    const btn1 = createButton('first');
    const btn2 = createButton('middle');
    const btn3 = createButton('last');
    const containerRef = createMockContainer([btn1, btn2, btn3]);

    const { result } = renderHook(() => useFocusTrap(containerRef, true));

    // Focus on middle
    btn2.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    act(() => {
      result.current.handleTabKey(event);
    });

    // Should not wrap - middle is not first or last
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
