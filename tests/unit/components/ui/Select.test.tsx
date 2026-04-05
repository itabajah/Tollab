import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';

import { Select } from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';

vi.mock('@/utils/dom', () => ({
  getSelectValue: (e: Event) => (e.currentTarget as HTMLSelectElement).value,
}));

const OPTIONS: SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('Select', () => {
  it('renders all options', () => {
    render(<Select options={OPTIONS} value="a" onChange={vi.fn()} />);
    const opts = screen.getAllByRole('option');
    expect(opts).toHaveLength(3);
    expect(opts[0]).toHaveTextContent('Alpha');
  });

  it('renders placeholder as first disabled option', () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Pick one" />);
    const placeholder = screen.getByRole('option', { name: 'Pick one' });
    expect(placeholder).toBeDisabled();
  });

  it('selects the provided value', () => {
    render(<Select options={OPTIONS} value="b" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('b');
  });

  it('calls onChange with selected value', () => {
    const spy = vi.fn();
    render(<Select options={OPTIONS} value="a" onChange={spy} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c' } });
    expect(spy).toHaveBeenCalledWith('c');
  });

  it('disables the select when disabled=true', () => {
    render(<Select options={OPTIONS} value="a" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('is not disabled by default', () => {
    render(<Select options={OPTIONS} value="a" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });

  it('passes id attribute', () => {
    render(<Select options={OPTIONS} value="a" onChange={vi.fn()} id="my-select" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'my-select');
  });

  it('passes aria-label attribute', () => {
    render(<Select options={OPTIONS} value="a" onChange={vi.fn()} aria-label="Choose item" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Choose item');
  });

  it('passes className', () => {
    render(<Select options={OPTIONS} value="a" onChange={vi.fn()} className="custom" />);
    expect(screen.getByRole('combobox')).toHaveClass('custom');
  });

  it('renders disabled individual options', () => {
    const opts: SelectOption[] = [
      { value: 'x', label: 'Active' },
      { value: 'y', label: 'Disabled', disabled: true },
    ];
    render(<Select options={opts} value="x" onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Disabled' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Active' })).not.toBeDisabled();
  });

  it('renders correctly with empty options', () => {
    render(<Select options={[]} value="" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});