/**
 * Tests for EventChip component.
 *
 * Covers: render, positioning, course name, background color,
 * click handler, keyboard support, title tooltip.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';
import { EventChip } from '@/components/calendar/EventChip';
import type { Course, ScheduleSlot } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'c-1',
    name: 'Intro to CS',
    number: '234111',
    points: '3.0',
    lecturer: 'Dr. Smith',
    faculty: 'CS',
    location: 'Taub 2',
    grade: '',
    color: 'hsl(200, 45%, 50%)',
    syllabus: '',
    notes: '',
    exams: { moedA: '', moedB: '' },
    schedule: [],
    homework: [],
    recordings: { tabs: [] },
    ...overrides,
  };
}

function makeSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return { day: 0, start: '10:00', end: '12:00', ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventChip', () => {
  // -- Render basics --------------------------------------------------------

  it('renders without crash', () => {
    render(<EventChip course={makeCourse()} slot={makeSlot()} />);
    expect(screen.getByText('Intro to CS')).toBeInTheDocument();
  });

  it('displays course name', () => {
    render(<EventChip course={makeCourse({ name: 'Data Structures' })} slot={makeSlot()} />);
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
  });

  it('has schedule-block CSS class', () => {
    const { container } = render(<EventChip course={makeCourse()} slot={makeSlot()} />);
    expect(container.querySelector('.schedule-block')).toBeInTheDocument();
  });

  // -- Positioning ----------------------------------------------------------

  it('sets height based on duration', () => {
    const { container } = render(
      <EventChip course={makeCourse()} slot={makeSlot({ start: '10:00', end: '12:00' })} />
    );
    const block = container.querySelector('.schedule-block') as HTMLElement;
    // 2 hours * 30px - 4 = 56px
    expect(block.style.height).toBe('56px');
  });

  it('sets top offset based on start minutes', () => {
    const { container } = render(
      <EventChip course={makeCourse()} slot={makeSlot({ start: '10:30', end: '12:00' })} />
    );
    const block = container.querySelector('.schedule-block') as HTMLElement;
    // (30/60) * 30 + 2 = 17px
    expect(block.style.top).toBe('17px');
  });

  it('calculates correct height for 1-hour slot', () => {
    const { container } = render(
      <EventChip course={makeCourse()} slot={makeSlot({ start: '09:00', end: '10:00' })} />
    );
    const block = container.querySelector('.schedule-block') as HTMLElement;
    // 1 hour * 30px - 4 = 26px
    expect(block.style.height).toBe('26px');
  });

  it('handles half-hour boundaries', () => {
    const { container } = render(
      <EventChip course={makeCourse()} slot={makeSlot({ start: '08:00', end: '09:30' })} />
    );
    const block = container.querySelector('.schedule-block') as HTMLElement;
    // 1.5 hours * 30 - 4 = 41px
    expect(block.style.height).toBe('41px');
  });

  // -- Background color -----------------------------------------------------

  it('applies course color as backgroundColor', () => {
    const { container } = render(
      <EventChip course={makeCourse({ color: 'hsl(100, 45%, 50%)' })} slot={makeSlot()} />
    );
    const block = container.querySelector('.schedule-block') as HTMLElement;
    // jsdom converts HSL to RGB, so just check it's set (non-empty)
    expect(block.style.backgroundColor).not.toBe('');
  });

  it('does not set backgroundColor when color is empty', () => {
    const { container } = render(
      <EventChip course={makeCourse({ color: '' })} slot={makeSlot()} />
    );
    const block = container.querySelector('.schedule-block') as HTMLElement;
    expect(block.style.backgroundColor).toBe('');
  });

  // -- Title tooltip --------------------------------------------------------

  it('sets title with course name, time range, and location', () => {
    const { container } = render(
      <EventChip
        course={makeCourse({ name: 'Algorithms', location: 'Taub 1' })}
        slot={makeSlot({ start: '10:00', end: '12:00' })}
      />
    );
    const block = container.querySelector('.schedule-block') as HTMLElement;
    expect(block.title).toContain('Algorithms');
    expect(block.title).toContain('10:00 - 12:00');
    expect(block.title).toContain('Taub 1');
  });

  // -- Accessibility --------------------------------------------------------

  it('has role button and tabIndex 0', () => {
    const { container } = render(<EventChip course={makeCourse()} slot={makeSlot()} />);
    const block = container.querySelector('.schedule-block')!;
    expect(block).toHaveAttribute('role', 'button');
    expect(block).toHaveAttribute('tabindex', '0');
  });

  // -- Click handler --------------------------------------------------------

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<EventChip course={makeCourse()} slot={makeSlot()} onClick={onClick} />);
    fireEvent.click(screen.getByText('Intro to CS'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not throw when clicked without onClick', () => {
    render(<EventChip course={makeCourse()} slot={makeSlot()} />);
    expect(() => fireEvent.click(screen.getByText('Intro to CS'))).not.toThrow();
  });

  // -- Keyboard support -----------------------------------------------------

  it('calls onClick on Enter key', () => {
    const onClick = vi.fn();
    const { container } = render(
      <EventChip course={makeCourse()} slot={makeSlot()} onClick={onClick} />
    );
    fireEvent.keyDown(container.querySelector('.schedule-block')!, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Space key', () => {
    const onClick = vi.fn();
    const { container } = render(
      <EventChip course={makeCourse()} slot={makeSlot()} onClick={onClick} />
    );
    fireEvent.keyDown(container.querySelector('.schedule-block')!, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick on other keys', () => {
    const onClick = vi.fn();
    const { container } = render(
      <EventChip course={makeCourse()} slot={makeSlot()} onClick={onClick} />
    );
    fireEvent.keyDown(container.querySelector('.schedule-block')!, { key: 'a' });
    expect(onClick).not.toHaveBeenCalled();
  });
});
