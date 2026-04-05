/**
 * Tests for MainLayout component.
 */

import { render, screen } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/homework', () => ({
  HomeworkSidebar: () => <div data-testid="homework-sidebar" />,
}));

import { MainLayout } from '@/components/layout/MainLayout';

describe('MainLayout', () => {
  it('renders the app-layout container', () => {
    const { container } = render(<MainLayout />);
    expect(container.querySelector('.app-layout')).toBeTruthy();
  });

  it('renders left column (.container)', () => {
    const { container } = render(<MainLayout />);
    expect(container.querySelector('.container')).toBeTruthy();
  });

  it('renders right column (.calendar-container)', () => {
    const { container } = render(<MainLayout />);
    expect(container.querySelector('.calendar-container')).toBeTruthy();
  });

  it('renders courseListSlot in left column when provided', () => {
    render(<MainLayout courseListSlot={<div data-testid="course-list">Courses</div>} />);
    expect(screen.getByTestId('course-list')).toBeInTheDocument();
  });

  it('renders default placeholder when no courseListSlot', () => {
    render(<MainLayout />);
    expect(screen.getByText('Add Course')).toBeInTheDocument();
  });

  it('renders sidebarSlot in right column when provided', () => {
    render(<MainLayout sidebarSlot={<div data-testid="sidebar">Sidebar</div>} />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders default sidebar with HomeworkSidebar when no sidebarSlot', () => {
    render(<MainLayout />);
    expect(screen.getByTestId('homework-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
  });

  it('renders no classes placeholder in default sidebar', () => {
    render(<MainLayout />);
    expect(screen.getByText('No classes scheduled.')).toBeInTheDocument();
  });
});
