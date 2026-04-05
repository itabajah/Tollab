/**
 * Tests for HomeworkItem component.
 *
 * Covers: sidebar render, modal render, checkbox toggle, due date display,
 * urgency colors, completed state, notes indicator, links, delete, reorder.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Homework } from '@/types';

// ---------------------------------------------------------------------------
// Mock stores
// ---------------------------------------------------------------------------

const mockToggle = vi.fn();
const mockDelete = vi.fn();
const mockReorder = vi.fn();
const mockUpdate = vi.fn();
const mockOpenCourseModal = vi.fn();

vi.mock('@/store/app-store', () => ({
  useAppStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        toggleHomeworkCompleted: mockToggle,
        deleteHomework: mockDelete,
        reorderHomework: mockReorder,
        updateHomework: mockUpdate,
      }),
    {
      getState: () => ({
        updateHomework: mockUpdate,
      }),
    },
  ),
}));

vi.mock('@/store/ui-store', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      openCourseModal: mockOpenCourseModal,
    }),
}));

const { HomeworkItem } = await import('@/components/homework/HomeworkItem');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHomework(overrides: Partial<Homework> = {}): Homework {
  return {
    title: 'HW 1 - Arrays',
    dueDate: '2025-12-15',
    completed: false,
    notes: '',
    links: [],
    ...overrides,
  };
}

interface RenderOpts {
  homework?: Partial<Homework>;
  variant?: 'sidebar' | 'modal';
  sortOrder?: string;
  isFirst?: boolean;
  isLast?: boolean;
}

function renderItem(opts: RenderOpts = {}) {
  const hw = makeHomework(opts.homework);
  return render(
    <HomeworkItem
      courseId="c-1"
      courseName="Intro to CS"
      courseColor="hsl(137, 45%, 50%)"
      homework={hw}
      homeworkIndex={0}
      variant={opts.variant ?? 'sidebar'}
      isFirst={opts.isFirst ?? false}
      isLast={opts.isLast ?? false}
      sortOrder={opts.sortOrder}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HomeworkItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Sidebar variant render -----------------------------------------------

  it('renders sidebar variant without crash', () => {
    renderItem();
    expect(screen.getByText('HW 1 - Arrays')).toBeInTheDocument();
  });

  it('displays due date in sidebar variant', () => {
    renderItem({ homework: { dueDate: '2025-12-15' } });
    expect(screen.getByText(/Dec/)).toBeInTheDocument();
  });

  it('displays "No Date" when no due date', () => {
    renderItem({ homework: { dueDate: '' } });
    expect(screen.getByText(/No Date/)).toBeInTheDocument();
  });

  it('displays course name', () => {
    renderItem();
    expect(screen.getByText('Intro to CS')).toBeInTheDocument();
  });

  it('shows "has notes" indicator when notes exist', () => {
    renderItem({ homework: { notes: 'Some notes here' } });
    expect(screen.getByText('has notes')).toBeInTheDocument();
  });

  it('does not show "has notes" when notes are empty', () => {
    renderItem({ homework: { notes: '' } });
    expect(screen.queryByText('has notes')).not.toBeInTheDocument();
  });

  // -- Checkbox toggle ------------------------------------------------------

  it('renders an unchecked checkbox for incomplete homework', () => {
    renderItem({ homework: { completed: false } });
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('renders a checked checkbox for completed homework', () => {
    renderItem({ homework: { completed: true } });
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls toggleHomeworkCompleted on checkbox click', () => {
    renderItem();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(mockToggle).toHaveBeenCalledWith('c-1', 0);
  });

  // -- Completed opacity ----------------------------------------------------

  it('applies reduced opacity for completed sidebar items', () => {
    const { container } = renderItem({ homework: { completed: true } });
    const card = container.querySelector('.event-card') as HTMLElement;
    expect(card.style.opacity).toBe('0.6');
  });

  // -- Border color ---------------------------------------------------------

  it('applies course color as border-left', () => {
    const { container } = renderItem();
    const card = container.querySelector('.event-card') as HTMLElement;
    // jsdom converts HSL to RGB, so just check it's set (non-empty)
    expect(card.style.borderLeftColor).not.toBe('');
  });

  // -- Links in sidebar variant ---------------------------------------------

  it('renders links in sidebar variant', () => {
    renderItem({
      homework: {
        links: [
          { label: 'Submission', url: 'https://example.com/submit' },
        ],
      },
    });
    expect(screen.getByText('Submission')).toBeInTheDocument();
  });

  it('shows "+N more" for more than 3 links', () => {
    renderItem({
      homework: {
        links: [
          { label: 'Link 1', url: 'https://a.com' },
          { label: 'Link 2', url: 'https://b.com' },
          { label: 'Link 3', url: 'https://c.com' },
          { label: 'Link 4', url: 'https://d.com' },
        ],
      },
    });
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  // -- Modal variant --------------------------------------------------------

  it('renders modal variant with homework-item class', () => {
    const { container } = renderItem({ variant: 'modal' });
    expect(container.querySelector('.homework-item')).toBeInTheDocument();
  });

  it('shows completed class in modal variant', () => {
    const { container } = renderItem({ variant: 'modal', homework: { completed: true } });
    expect(container.querySelector('.homework-item.completed')).toBeInTheDocument();
  });

  it('shows Edit and Delete buttons in modal variant', () => {
    renderItem({ variant: 'modal' });
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows "No date" in modal variant when no due date', () => {
    renderItem({ variant: 'modal', homework: { dueDate: '' } });
    expect(screen.getByText('No date')).toBeInTheDocument();
  });

  // -- Reorder buttons (modal, manual sort) ---------------------------------

  it('shows reorder buttons in manual sort mode', () => {
    renderItem({ variant: 'modal', sortOrder: 'manual' });
    expect(screen.getByLabelText('Move up')).toBeInTheDocument();
    expect(screen.getByLabelText('Move down')).toBeInTheDocument();
  });

  it('does not show reorder buttons in non-manual sort', () => {
    renderItem({ variant: 'modal', sortOrder: 'date_asc' });
    expect(screen.queryByLabelText('Move up')).not.toBeInTheDocument();
  });

  it('disables up when isFirst', () => {
    renderItem({ variant: 'modal', sortOrder: 'manual', isFirst: true });
    expect(screen.getByLabelText('Move up')).toBeDisabled();
  });

  it('disables down when isLast', () => {
    renderItem({ variant: 'modal', sortOrder: 'manual', isLast: true });
    expect(screen.getByLabelText('Move down')).toBeDisabled();
  });

  // -- Notes textarea in modal variant --------------------------------------

  it('renders notes textarea in modal variant', () => {
    renderItem({ variant: 'modal', homework: { notes: 'My notes' } });
    const textarea = screen.getByPlaceholderText('Add notes...');
    expect(textarea).toHaveValue('My notes');
  });
});
