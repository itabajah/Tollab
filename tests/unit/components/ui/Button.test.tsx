import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';

import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('defaults to type="button"', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('renders with type="submit"', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('renders with type="reset"', () => {
    render(<Button type="reset">Reset</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
  });

  it('applies primary variant class by default', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('applies secondary variant class', () => {
    render(<Button variant="secondary">Sec</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });

  it('applies danger variant class', () => {
    render(<Button variant="danger">Del</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('merges custom className with variant class', () => {
    render(<Button className="extra">Ok</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('btn-primary');
    expect(btn).toHaveClass('extra');
  });

  it('is not disabled by default', () => {
    render(<Button>Enabled</Button>);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('disables button when disabled=true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not fire onClick when disabled', () => {
    const spy = vi.fn();
    render(<Button disabled onClick={spy}>Nope</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows Loading when loading=true', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button').textContent).toContain('Loading');
  });

  it('does not show children when loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button').textContent).not.toContain('Save');
  });

  it('disables button when loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('sets aria-busy when loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('does not set aria-busy when not loading', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  it('calls onClick when clicked', () => {
    const spy = vi.fn();
    render(<Button onClick={spy}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when loading', () => {
    const spy = vi.fn();
    render(<Button loading onClick={spy}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(spy).not.toHaveBeenCalled();
  });
});