/**
 * Tests for PromptDialog component.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/modals/useFocusTrap', () => ({
  useFocusTrap: () => ({ handleTabKey: vi.fn() }),
}));

import { PromptDialog } from '@/components/modals/PromptDialog';

function renderPrompt(overrides: Partial<{
  isOpen: boolean;
  message: string;
  defaultValue: string;
  title: string;
  confirmText: string;
  cancelText: string;
  placeholder: string;
  inputType: string;
  required: boolean;
  validate: (value: string) => true | string;
  onResolve: (result: string | null) => void;
}> = {}) {
  const defaults = {
    isOpen: true,
    message: 'Enter a name',
    onResolve: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  return { ...render(<PromptDialog {...props} />), onResolve: props.onResolve };
}

describe('PromptDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderPrompt({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open', () => {
    renderPrompt();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays the message', () => {
    renderPrompt({ message: 'What is the course name?' });
    expect(screen.getByText('What is the course name?')).toBeInTheDocument();
  });

  it('uses default title "Input Required"', () => {
    renderPrompt();
    expect(screen.getByText('Input Required')).toBeInTheDocument();
  });

  it('uses custom title', () => {
    renderPrompt({ title: 'Rename' });
    expect(screen.getByText('Rename')).toBeInTheDocument();
  });

  it('uses default button texts', () => {
    renderPrompt();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('uses custom button texts', () => {
    renderPrompt({ confirmText: 'Save', cancelText: 'Discard' });
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
  });

  it('sets default value in input', () => {
    renderPrompt({ defaultValue: 'My Course' });
    const input = screen.getByRole('dialog').querySelector('input')!;
    expect(input.value).toBe('My Course');
  });

  it('sets placeholder in input', () => {
    renderPrompt({ placeholder: 'Type here...' });
    const input = screen.getByRole('dialog').querySelector('input')!;
    expect(input.placeholder).toBe('Type here...');
  });

  it('updates input value on type', () => {
    renderPrompt();
    const input = screen.getByRole('dialog').querySelector('input')!;
    fireEvent.input(input, { target: { value: 'New Value' } });
    expect(input.value).toBe('New Value');
  });

  it('submits trimmed value on OK click', () => {
    const { onResolve } = renderPrompt({ defaultValue: '  hello  ' });
    fireEvent.click(screen.getByText('OK'));
    expect(onResolve).toHaveBeenCalledWith('hello');
  });

  it('resolves null when empty and not required', () => {
    const { onResolve } = renderPrompt({ defaultValue: '' });
    fireEvent.click(screen.getByText('OK'));
    expect(onResolve).toHaveBeenCalledWith(null);
  });

  it('shows error for required empty field', () => {
    const { onResolve } = renderPrompt({ required: true, defaultValue: '' });
    fireEvent.click(screen.getByText('OK'));
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('shows custom validation error', () => {
    const validate = (v: string) => (v.length < 3 ? 'Too short' : true);
    const { onResolve } = renderPrompt({ validate, defaultValue: 'ab' });
    fireEvent.click(screen.getByText('OK'));
    expect(screen.getByText('Too short')).toBeInTheDocument();
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('shows default error when validate returns empty string', () => {
    const validate = (_v: string) => '' as unknown as true | string;
    renderPrompt({ validate, defaultValue: 'x' });
    fireEvent.click(screen.getByText('OK'));
    expect(screen.getByText('Invalid input')).toBeInTheDocument();
  });

  it('clears error on new input', () => {
    const { onResolve } = renderPrompt({ required: true, defaultValue: '' });
    fireEvent.click(screen.getByText('OK'));
    expect(screen.getByText('This field is required')).toBeInTheDocument();

    const input = screen.getByRole('dialog').querySelector('input')!;
    fireEvent.input(input, { target: { value: 'now ok' } });
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('resolves null on Cancel click', () => {
    const { onResolve } = renderPrompt();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onResolve).toHaveBeenCalledWith(null);
  });

  it('resolves null on Escape key', () => {
    const { onResolve } = renderPrompt();
    fireEvent.keyDown(screen.getByRole('dialog').parentElement!, { key: 'Escape' });
    expect(onResolve).toHaveBeenCalledWith(null);
  });

  it('submits on Enter key', () => {
    const { onResolve } = renderPrompt({ defaultValue: 'test' });
    fireEvent.keyDown(screen.getByRole('dialog').parentElement!, { key: 'Enter' });
    expect(onResolve).toHaveBeenCalledWith('test');
  });

  it('resolves null on overlay click', () => {
    const { onResolve } = renderPrompt();
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay, { target: overlay });
    expect(onResolve).toHaveBeenCalledWith(null);
  });

  it('has aria-modal and aria-label', () => {
    renderPrompt({ title: 'Custom' });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Custom');
  });

  it('applies input-error class when error is shown', () => {
    renderPrompt({ required: true, defaultValue: '' });
    fireEvent.click(screen.getByText('OK'));
    const input = screen.getByRole('dialog').querySelector('input')!;
    expect(input.className).toContain('input-error');
  });
});
