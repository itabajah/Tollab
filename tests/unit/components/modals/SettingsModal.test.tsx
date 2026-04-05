import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/settings/ProfileTab', () => ({
  ProfileTab: () => <div data-testid="profile-tab">Profile Content</div>,
}));
vi.mock('@/components/settings/AppearanceTab', () => ({
  AppearanceTab: () => <div data-testid="appearance-tab">Appearance Content</div>,
}));
vi.mock('@/components/settings/CalendarTab', () => ({
  CalendarTab: () => <div data-testid="calendar-tab">Calendar Content</div>,
}));
vi.mock('@/components/settings/FetchDataTab', () => ({
  FetchDataTab: () => <div data-testid="fetch-tab">Fetch Content</div>,
}));
vi.mock('@/components/modals/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: preact.ComponentChildren; title: string }) =>
    isOpen ? <div data-testid="modal" role="dialog"><h2>{title}</h2>{children}</div> : null,
}));

import { SettingsModal } from '@/components/modals/SettingsModal';

describe('SettingsModal', () => {
  const defaultProps = { isOpen: true, onClose: vi.fn() };
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders when open', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders all 4 tab buttons', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /Profile/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Appearance/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Calendar/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Fetch Data/ })).toBeInTheDocument();
  });

  it('defaults to Profile tab active', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /Profile/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
  });

  it('switches to Appearance tab on click', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /Appearance/ }));
    expect(screen.getByRole('tab', { name: /Appearance/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('appearance-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument();
  });

  it('switches to Calendar tab on click', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /Calendar/ }));
    expect(screen.getByTestId('calendar-tab')).toBeInTheDocument();
  });

  it('switches to Fetch Data tab on click', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /Fetch Data/ }));
    expect(screen.getByTestId('fetch-tab')).toBeInTheDocument();
  });

  it('has tablist with aria-label', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Settings tabs');
  });

  it('has 4 tabs with role="tab"', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('active tab has tabIndex 0, others have -1', () => {
    render(<SettingsModal {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    const active = tabs.find(t => t.getAttribute('aria-selected') === 'true');
    const inactive = tabs.filter(t => t.getAttribute('aria-selected') !== 'true');
    expect(active).toHaveAttribute('tabindex', '0');
    inactive.forEach(t => expect(t).toHaveAttribute('tabindex', '-1'));
  });

  it('tab has aria-controls pointing to its panel', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /Profile/ })).toHaveAttribute('aria-controls', 'settings-panel-profile');
  });

  it('tab panels have role="tabpanel"', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getAllByRole('tabpanel').length).toBeGreaterThanOrEqual(1);
  });

  it('ArrowRight moves to next tab', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /Profile/ }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Appearance/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowLeft wraps to last tab from first', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /Profile/ }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: /Fetch Data/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowRight wraps from last to first tab', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /Fetch Data/ }));
    fireEvent.keyDown(screen.getByRole('tab', { name: /Fetch Data/ }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Profile/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('Home moves to first tab', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /Calendar/ }));
    fireEvent.keyDown(screen.getByRole('tab', { name: /Calendar/ }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: /Profile/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('End moves to last tab', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /Profile/ }), { key: 'End' });
    expect(screen.getByRole('tab', { name: /Fetch Data/ })).toHaveAttribute('aria-selected', 'true');
  });
});