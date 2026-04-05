import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';

import { Checkbox } from '@/components/ui/Checkbox';

vi.mock('@/utils/dom', () => ({
  getInputChecked: (e: Event) => (e.currentTarget as HTMLInputElement).checked,
}));

describe('Checkbox', () => {
  it('renders with label text', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Accept terms" />);
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
  });

  it('checkbox is checked when checked=true', () => {
    render(<Checkbox checked={true} onChange={vi.fn()} label="Done" />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('checkbox is unchecked when checked=false', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Done" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onChange with true when clicking unchecked box', () => {
    const spy = vi.fn();
    render(<Checkbox checked={false} onChange={spy} label="Toggle" />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when clicking checked box', () => {
    const spy = vi.fn();
    render(<Checkbox checked={true} onChange={spy} label="Toggle" />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('disables checkbox when disabled=true', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Off" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('does not fire onChange when disabled', () => {
    const spy = vi.fn();
    render(<Checkbox checked={false} onChange={spy} label="Disabled" disabled />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('is not disabled by default', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="On" />);
    expect(screen.getByRole('checkbox')).not.toBeDisabled();
  });

  it('generates id from label when id is not provided', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Show Done" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'checkbox-show-done');
  });

  it('uses provided id when given', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Show Done" id="custom-id" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'custom-id');
  });

  it('passes className to the label wrapper', () => {
    const { container } = render(
      <Checkbox checked={false} onChange={vi.fn()} label="X" className="my-class" />,
    );
    expect(container.querySelector('label')).toHaveClass('my-class');
  });
});