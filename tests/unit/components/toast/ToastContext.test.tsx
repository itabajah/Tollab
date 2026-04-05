/**
 * Tests for ToastContext (ToastProvider + useToast hook).
 */

import { render, screen, act } from '@testing-library/preact';
import { renderHook } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastProvider, useToast } from '@/components/toast/ToastContext';
import { ToastType } from '@/types';
import type { ComponentChildren } from 'preact';

function renderUseToast() {
  return renderHook(() => useToast(), {
    wrapper: ({ children }: { children: ComponentChildren }) => (
      <ToastProvider>{children}</ToastProvider>
    ),
  });
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a <ToastProvider>');
  });

  it('starts with empty toasts', () => {
    const { result } = renderUseToast();
    expect(result.current.toasts).toHaveLength(0);
  });

  it('showToast adds a toast', () => {
    const { result } = renderUseToast();
    act(() => {
      result.current.showToast('Hello');
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.message).toBe('Hello');
  });

  it('showToast defaults to Info type', () => {
    const { result } = renderUseToast();
    act(() => {
      result.current.showToast('Test');
    });
    expect(result.current.toasts[0]?.type).toBe(ToastType.Info);
  });

  it('showToast respects custom type', () => {
    const { result } = renderUseToast();
    act(() => {
      result.current.showToast('Error!', ToastType.Error);
    });
    expect(result.current.toasts[0]?.type).toBe(ToastType.Error);
  });

  it('showToast returns an id', () => {
    const { result } = renderUseToast();
    let id: string = '';
    act(() => {
      id = result.current.showToast('Test');
    });
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('dismissToast removes a toast by id', () => {
    const { result } = renderUseToast();
    let id: string = '';
    act(() => {
      id = result.current.showToast('Bye');
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      result.current.dismissToast(id);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('uses default duration 4000 for non-error toasts', () => {
    const { result } = renderUseToast();
    act(() => {
      result.current.showToast('Info toast');
    });
    expect(result.current.toasts[0]?.duration).toBe(4000);
  });

  it('uses error duration 6000 for error toasts', () => {
    const { result } = renderUseToast();
    act(() => {
      result.current.showToast('Error toast', ToastType.Error);
    });
    expect(result.current.toasts[0]?.duration).toBe(6000);
  });

  it('respects custom duration in options', () => {
    const { result } = renderUseToast();
    act(() => {
      result.current.showToast('Custom', ToastType.Info, { duration: 1000 });
    });
    expect(result.current.toasts[0]?.duration).toBe(1000);
  });

  it('limits to 5 visible toasts', () => {
    const { result } = renderUseToast();
    act(() => {
      for (let i = 0; i < 7; i++) {
        result.current.showToast(`Toast ${i}`);
      }
    });
    expect(result.current.toasts).toHaveLength(5);
    // Oldest should be removed
    expect(result.current.toasts[0]?.message).toBe('Toast 2');
  });

  it('provides context through ToastProvider', () => {
    function TestComponent() {
      const { showToast, toasts } = useToast();
      return (
        <div>
          <span data-testid="count">{toasts.length}</span>
          <button onClick={() => showToast('Test')}>Add</button>
        </div>
      );
    }
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});
