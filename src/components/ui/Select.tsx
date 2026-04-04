/**
 * Styled select dropdown.
 * Uses the native <select> element styled by components.css.
 */

import type { JSX } from 'preact';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
}: SelectProps) {
  const handleChange = (e: JSX.TargetedEvent<HTMLSelectElement>) => {
    onChange((e.target as HTMLSelectElement).value);
  };

  return (
    <select
      id={id}
      className={className}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
