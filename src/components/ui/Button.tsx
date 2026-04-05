/**
 * Button component with variant (primary/secondary/danger), size, disabled, and loading states.
 * Uses existing CSS classes from components.css.
 */

import type { ComponentChildren, JSX } from 'preact';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
};

interface ButtonProps {
  children: ComponentChildren;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  onClick?: (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
}

export function Button({
  children,
  variant = 'primary',
  size: _size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  className,
  onClick,
}: ButtonProps) {
  const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={disabled || loading ? undefined : onClick}
      aria-busy={loading || undefined}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}
