/**
 * Tests for CourseTabIcons, IconButton, and barrel export coverage.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';

// -- CourseTabIcons --
import {
  RecordingsTabIcon,
  HomeworkTabIcon,
  DetailsTabIcon,
} from '@/components/icons/CourseTabIcons';

describe('CourseTabIcons', () => {
  it('renders RecordingsTabIcon with SVG', () => {
    const { container } = render(<RecordingsTabIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders HomeworkTabIcon with SVG', () => {
    const { container } = render(<HomeworkTabIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders DetailsTabIcon with SVG', () => {
    const { container } = render(<DetailsTabIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('RecordingsTabIcon has correct viewBox', () => {
    const { container } = render(<RecordingsTabIcon />);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 14');
  });

  it('HomeworkTabIcon has correct viewBox', () => {
    const { container } = render(<HomeworkTabIcon />);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('DetailsTabIcon has correct viewBox', () => {
    const { container } = render(<DetailsTabIcon />);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
  });
});

// -- IconButton --
import { IconButton } from '@/components/ui/IconButton';

describe('IconButton', () => {
  it('renders with label', () => {
    render(<IconButton label="Edit">✎</IconButton>);
    const btn = screen.getByLabelText('Edit');
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('title')).toBe('Edit');
  });

  it('renders children', () => {
    render(<IconButton label="Delete"><span data-testid="icon">🗑</span></IconButton>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('is not disabled by default', () => {
    render(<IconButton label="Test">X</IconButton>);
    expect(screen.getByLabelText('Test')).not.toBeDisabled();
  });

  it('can be disabled', () => {
    render(<IconButton label="Test" disabled>X</IconButton>);
    expect(screen.getByLabelText('Test')).toBeDisabled();
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<IconButton label="Click me" onClick={onClick}>X</IconButton>);
    fireEvent.click(screen.getByLabelText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<IconButton label="Test" className="custom-class">X</IconButton>);
    const btn = screen.getByLabelText('Test');
    expect(btn.className).toContain('icon-btn');
    expect(btn.className).toContain('custom-class');
  });

  it('has type="button"', () => {
    render(<IconButton label="Test">X</IconButton>);
    expect(screen.getByLabelText('Test').getAttribute('type')).toBe('button');
  });
});
