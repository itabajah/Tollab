/**
 * Icon-only button with aria-label tooltip.
 * Uses the .icon-btn CSS class from components.css.
 */

import type { ComponentChildren, JSX } from 'preact';

interface IconButtonProps {
  /** Accessible label (shown as tooltip via title attribute). */
  label: string;
  children: ComponentChildren;
  disabled?: boolean;
  className?: string;
  onClick?: (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
}

export function IconButton({ label, children, disabled = false, className, onClick }: IconButtonProps) {
  const classes = ['icon-btn', className].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
