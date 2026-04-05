/**
 * Styled checkbox with label.
 * Uses native checkbox styled by components.css accent-color.
 */

import { useCallback } from 'preact/hooks';
import type { JSX } from 'preact';
import { getInputChecked } from '@/utils/dom';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Checkbox({ checked, onChange, label, disabled = false, id, className }: CheckboxProps) {
  const checkboxId = id ?? `checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const handleChange = useCallback(
    (e: JSX.TargetedEvent<HTMLInputElement>) => {
      onChange(getInputChecked(e));
    },
    [onChange],
  );

  return (
    <label className={className} htmlFor={checkboxId}>
      <input
        type="checkbox"
        id={checkboxId}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />
      {label}
    </label>
  );
}
