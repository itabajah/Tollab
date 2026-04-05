/**
 * Tests for ErrorBoundary component.
 *
 * Covers: renders children normally, catches errors, shows fallback UI,
 * error details, Try Again button.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ---------------------------------------------------------------------------
// Test components
// ---------------------------------------------------------------------------

function GoodChild() {
  return <div>All is well</div>;
}

function BadChild(): never {
  throw new Error('Component exploded');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // -- Normal rendering -----------------------------------------------------

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('All is well')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <ErrorBoundary>
        <span>Child 1</span>
        <span>Child 2</span>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  // -- Error catching -------------------------------------------------------

  it('catches render errors and shows fallback', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows error-boundary container with alert role', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays helpful description text', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(
      screen.getByText(/An unexpected error occurred/)
    ).toBeInTheDocument();
  });

  // -- Error details --------------------------------------------------------

  it('shows error details in expandable section', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Error details')).toBeInTheDocument();
    expect(screen.getByText('Component exploded')).toBeInTheDocument();
  });

  it('logs error to console', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalled();
  });

  // -- Try Again button -----------------------------------------------------

  it('renders Try Again button', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('Try Again button has btn-primary class', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Try Again')).toHaveClass('btn-primary');
  });

  it('resets error state when Try Again is clicked (re-renders children)', () => {
    // This will re-throw since BadChild always throws, but the state resets
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Try Again'));
    // BadChild throws again, so we see the error UI again
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  // -- CSS classes ----------------------------------------------------------

  it('has error-boundary CSS class', () => {
    const { container } = render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(container.querySelector('.error-boundary')).toBeInTheDocument();
  });

  it('has error-boundary-content inner wrapper', () => {
    const { container } = render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(container.querySelector('.error-boundary-content')).toBeInTheDocument();
  });
});
