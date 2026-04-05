import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HomeworkByUrgency, HomeworkWithCourse } from '@/store/selectors';

function makeHwEntry(overrides: Partial<HomeworkWithCourse> = {}): HomeworkWithCourse {
  return {
    courseId: 'c1', courseName: 'CS 101', courseColor: 'hsl(200, 45%, 50%)',
    homework: { title: 'HW 1', dueDate: '2025-06-15', completed: false, notes: '', links: [] },
    homeworkIndex: 0, ...overrides,
  };
}

function emptyGrouped(): HomeworkByUrgency {
  return { overdue: [], today: [], thisWeek: [], upcoming: [], noDate: [] };
}

const mockAddHomework = vi.fn();
let mockGrouped: HomeworkByUrgency = emptyGrouped();
let mockShowCompleted = false;
const mockToggleShowCompleted = vi.fn();

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ addHomework: mockAddHomework }),
}));

vi.mock('@/store/selectors', () => ({
  useCurrentSemester: () => ({
    id: 's1', name: 'Spring 2025',
    courses: [{ id: 'c1', name: 'CS 101' }, { id: 'c2', name: 'Math 201' }],
  }),
  useHomeworkByUrgency: () => mockGrouped,
}));

vi.mock('@/store/ui-store', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ showCompletedHomework: mockShowCompleted, toggleShowCompletedHomework: mockToggleShowCompleted }),
}));

vi.mock('@/utils/dom', () => ({
  getInputValue: (e: Event) => (e.currentTarget as HTMLInputElement).value,
  getSelectValue: (e: Event) => (e.currentTarget as HTMLSelectElement).value,
}));

vi.mock('@/components/homework/HomeworkItem', () => ({
  HomeworkItem: (props: { homework: { title: string } }) => (
    <div data-testid="homework-item">{props.homework.title}</div>
  ),
}));

import { HomeworkSidebar } from '@/components/homework/HomeworkSidebar';

describe('HomeworkSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGrouped = emptyGrouped();
    mockShowCompleted = false;
  });

  it('renders section header', () => {
    render(<HomeworkSidebar />);
    expect(screen.getByText('Homework')).toBeInTheDocument();
  });

  it('renders Show Done toggle', () => {
    render(<HomeworkSidebar />);
    expect(screen.getByText('Show Done')).toBeInTheDocument();
  });

  it('renders empty message when no homework', () => {
    render(<HomeworkSidebar />);
    expect(screen.getByText('No homework found.')).toBeInTheDocument();
  });

  it('renders overdue section when items exist', () => {
    mockGrouped = { ...emptyGrouped(), overdue: [makeHwEntry()] };
    render(<HomeworkSidebar />);
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  });

  it('renders today section', () => {
    mockGrouped = { ...emptyGrouped(), today: [makeHwEntry()] };
    render(<HomeworkSidebar />);
    expect(screen.getByText(/Today/)).toBeInTheDocument();
  });

  it('renders this week section', () => {
    mockGrouped = { ...emptyGrouped(), thisWeek: [makeHwEntry()] };
    render(<HomeworkSidebar />);
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  it('renders upcoming section', () => {
    mockGrouped = { ...emptyGrouped(), upcoming: [makeHwEntry()] };
    render(<HomeworkSidebar />);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('renders no date section', () => {
    mockGrouped = { ...emptyGrouped(), noDate: [makeHwEntry()] };
    render(<HomeworkSidebar />);
    expect(screen.getByText('No Date')).toBeInTheDocument();
  });

  it('renders multiple urgency sections simultaneously', () => {
    mockGrouped = { overdue: [makeHwEntry()], today: [makeHwEntry({ homeworkIndex: 1 })], thisWeek: [], upcoming: [], noDate: [] };
    render(<HomeworkSidebar />);
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
    expect(screen.getByText(/Today/)).toBeInTheDocument();
  });

  it('filters completed items when showCompleted is false', () => {
    const completedHw = makeHwEntry({ homework: { title: 'Done', dueDate: '', completed: true, notes: '', links: [] } });
    mockGrouped = { ...emptyGrouped(), overdue: [completedHw] };
    mockShowCompleted = false;
    render(<HomeworkSidebar />);
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('shows completed items when showCompleted is true', () => {
    const completedHw = makeHwEntry({ homework: { title: 'Done HW', dueDate: '', completed: true, notes: '', links: [] } });
    mockGrouped = { ...emptyGrouped(), noDate: [completedHw] };
    mockShowCompleted = true;
    render(<HomeworkSidebar />);
    expect(screen.getByText('Done HW')).toBeInTheDocument();
  });

  it('calls toggleShowCompleted on checkbox change', () => {
    render(<HomeworkSidebar />);
    fireEvent.change(screen.getByRole('checkbox'));
    expect(mockToggleShowCompleted).toHaveBeenCalled();
  });

  it('renders course selector when multiple courses exist', () => {
    render(<HomeworkSidebar />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows error when adding with empty title', () => {
    render(<HomeworkSidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter an assignment title');
    expect(mockAddHomework).not.toHaveBeenCalled();
  });

  it('adds homework with title', () => {
    render(<HomeworkSidebar />);
    fireEvent.input(screen.getByPlaceholderText('Assignment title...'), { target: { value: 'New HW' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(mockAddHomework).toHaveBeenCalledWith('c1', expect.objectContaining({ title: 'New HW', completed: false }));
  });

  it('clears title input after adding', () => {
    render(<HomeworkSidebar />);
    const input = screen.getByPlaceholderText('Assignment title...') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'New HW' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(input.value).toBe('');
  });

  it('adds homework on Enter key', () => {
    render(<HomeworkSidebar />);
    const input = screen.getByPlaceholderText('Assignment title...');
    fireEvent.input(input, { target: { value: 'Enter HW' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockAddHomework).toHaveBeenCalledOnce();
  });

  it('clears error on new input', () => {
    render(<HomeworkSidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.input(screen.getByPlaceholderText('Assignment title...'), { target: { value: 'x' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});