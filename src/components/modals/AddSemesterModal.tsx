import { useCallback, useMemo, useState } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import { useUiStore } from '@/store/ui-store';

import { Modal } from './Modal';

// ---------------------------------------------------------------------------
// Season options — matches legacy populateSemesterOptions() in course-logic.js
// ---------------------------------------------------------------------------

type Season = 'Winter' | 'Spring' | 'Summer';

const SEASONS: readonly Season[] = ['Winter', 'Spring', 'Summer'] as const;

function generateSemesterOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const options: string[] = [];

  for (const year of years) {
    for (const season of SEASONS) {
      options.push(
        season === 'Winter' ? `${season} ${year}-${year + 1}` : `${season} ${year}`,
      );
    }
  }

  return options;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Modal for adding a new semester.
 * Provides a season-based preset selector plus a custom name input.
 */
export function AddSemesterModal() {
  const modalStack = useUiStore((s) => s.modalStack);
  const popModal = useUiStore((s) => s.popModal);
  const addSemester = useAppStore((s) => s.addSemester);
  const setCurrentSemester = useAppStore((s) => s.setCurrentSemester);

  const isOpen = modalStack.includes('add-semester');

  const presets = useMemo(generateSemesterOptions, []);

  const [selected, setSelected] = useState(presets[0] ?? '');
  const [customName, setCustomName] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [error, setError] = useState('');

  const handleSelectChange = useCallback(
    (e: Event) => {
      const value = (e.currentTarget as HTMLSelectElement).value;
      if (value === 'custom') {
        setIsCustom(true);
        setError('');
      } else {
        setIsCustom(false);
        setSelected(value);
        setError('');
      }
    },
    [],
  );

  const handleCustomInput = useCallback(
    (e: Event) => {
      setCustomName((e.currentTarget as HTMLInputElement).value);
      setError('');
    },
    [],
  );

  const handleClose = useCallback(() => {
    popModal();
    setIsCustom(false);
    setCustomName('');
    setError('');
  }, [popModal]);

  const handleSubmit = useCallback(
    (e: Event) => {
      e.preventDefault();

      const name = isCustom ? customName.trim() : selected;

      if (!name) {
        setError('Semester name cannot be empty.');
        return;
      }

      if (name.length > 50) {
        setError('Name must be 50 characters or fewer.');
        return;
      }

      const id = addSemester(name);
      setCurrentSemester(id);

      // Reset form
      setIsCustom(false);
      setCustomName('');
      setError('');
      popModal();
    },
    [isCustom, customName, selected, addSemester, setCurrentSemester, popModal],
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Semester" size="md">
      <form onSubmit={handleSubmit}>
        <div class="form-group">
          <label for="new-semester-select">Select Semester</label>
          <select
            id="new-semester-select"
            value={isCustom ? 'custom' : selected}
            onChange={handleSelectChange}
          >
            {presets.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="custom">Custom...</option>
          </select>
        </div>

        {isCustom && (
          <div class="form-group">
            <label for="custom-semester-name">Custom Name</label>
            <input
              id="custom-semester-name"
              type="text"
              class="form-control"
              placeholder="e.g., Special Term 2024"
              value={customName}
              onInput={handleCustomInput}
              maxLength={50}
              autoFocus
            />
          </div>
        )}

        {error && <div class="form-error">{error}</div>}

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Create Semester
          </button>
        </div>
      </form>
    </Modal>
  );
}
