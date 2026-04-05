/**
 * Tests for ToastContainer component.
 */

import { render, screen } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseToast = vi.fn();

vi.mock('@/components/toast/ToastContext', () => ({
  useToast: () => mockUseToast(),
}));

vi.mock('@/components/toast/Toast', () => ({
  Toast: ({ id, message }: { id: string; message: string }) => (
    <div data-testid={`toast-${id}`}>{message}</div>
  ),
}));

import { ToastContainer } from '@/components/toast/ToastContainer';
import { ToastType } from '@/types';

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders container with correct classes', () => {
    mockUseToast.mockReturnValue({ toasts: [], dismissToast: vi.fn() });
    const { container } = render(<ToastContainer />);
    expect(container.querySelector('.toast-container')).toBeTruthy();
    expect(container.querySelector('.toast-bottom-right')).toBeTruthy();
  });

  it('has aria-live="polite" attribute', () => {
    mockUseToast.mockReturnValue({ toasts: [], dismissToast: vi.fn() });
    const { container } = render(<ToastContainer />);
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  it('renders nothing when no toasts', () => {
    mockUseToast.mockReturnValue({ toasts: [], dismissToast: vi.fn() });
    render(<ToastContainer />);
    expect(screen.queryByTestId(/toast-/)).not.toBeInTheDocument();
  });

  it('renders toasts from context', () => {
    mockUseToast.mockReturnValue({
      toasts: [
        { id: '1', type: ToastType.Info, message: 'Hello', options: {}, duration: 4000, createdAt: Date.now() },
        { id: '2', type: ToastType.Error, message: 'Error!', options: {}, duration: 6000, createdAt: Date.now() },
      ],
      dismissToast: vi.fn(),
    });
    render(<ToastContainer />);
    expect(screen.getByTestId('toast-1')).toBeInTheDocument();
    expect(screen.getByTestId('toast-2')).toBeInTheDocument();
  });

  it('renders correct number of toasts', () => {
    mockUseToast.mockReturnValue({
      toasts: [
        { id: 'a', type: ToastType.Success, message: 'A', options: {}, duration: 4000, createdAt: Date.now() },
        { id: 'b', type: ToastType.Warning, message: 'B', options: {}, duration: 4000, createdAt: Date.now() },
        { id: 'c', type: ToastType.Info, message: 'C', options: {}, duration: 4000, createdAt: Date.now() },
      ],
      dismissToast: vi.fn(),
    });
    render(<ToastContainer />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
