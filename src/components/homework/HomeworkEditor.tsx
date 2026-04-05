/**
 * HomeworkEditor — Inline editor for homework details.
 *
 * Shows when a HomeworkItem is expanded. Allows editing title, due date,
 * notes, and managing links (add / edit / remove).
 */

import { useCallback, useEffect, useState } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import type { HomeworkLink } from '@/types';
import { validateUrl } from '@/utils/validation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HomeworkEditorProps {
  courseId: string;
  homeworkIndex: number;
  title: string;
  dueDate: string;
  notes: string;
  links: HomeworkLink[];
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomeworkEditor({
  courseId,
  homeworkIndex,
  title: initialTitle,
  dueDate: initialDueDate,
  notes: initialNotes,
  links: initialLinks,
  onClose,
}: HomeworkEditorProps) {
  const updateHomework = useAppStore((s) => s.updateHomework);

  // -- Local form state -----------------------------------------------------
  const [title, setTitle] = useState(initialTitle);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [notes, setNotes] = useState(initialNotes);
  const [links, setLinks] = useState<HomeworkLink[]>(() =>
    initialLinks.map((l) => ({ ...l })),
  );

  // -- New link inputs ------------------------------------------------------
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // -- Editing existing link ------------------------------------------------
  const [editingLinkIdx, setEditingLinkIdx] = useState<number | null>(null);
  const [editLinkLabel, setEditLinkLabel] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');

  // Sync if props change (e.g., external mutation)
  useEffect(() => {
    setTitle(initialTitle);
    setDueDate(initialDueDate);
    setNotes(initialNotes);
    setLinks(initialLinks.map((l) => ({ ...l })));
  }, [initialTitle, initialDueDate, initialNotes, initialLinks]);

  // -- Link handlers --------------------------------------------------------

  const handleAddLink = useCallback(() => {
    const url = newLinkUrl.trim();
    if (!url) return;
    if (!validateUrl(url).valid) return;
    const label = newLinkLabel.trim() || extractDomain(url);
    setLinks((prev) => [...prev, { label, url }]);
    setNewLinkUrl('');
    setNewLinkLabel('');
  }, [newLinkUrl, newLinkLabel]);

  const handleRemoveLink = useCallback((index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleStartEditLink = useCallback(
    (index: number) => {
      const link = links[index];
      if (!link) return;
      setEditingLinkIdx(index);
      setEditLinkLabel(link.label);
      setEditLinkUrl(link.url);
    },
    [links],
  );

  const handleSaveEditLink = useCallback(() => {
    if (editingLinkIdx === null) return;
    const url = editLinkUrl.trim();
    if (!url) return;
    if (!validateUrl(url).valid) return;
    const label = editLinkLabel.trim() || extractDomain(url);
    setLinks((prev) =>
      prev.map((l, i) => (i === editingLinkIdx ? { label, url } : l)),
    );
    setEditingLinkIdx(null);
    setEditLinkLabel('');
    setEditLinkUrl('');
  }, [editingLinkIdx, editLinkLabel, editLinkUrl]);

  const handleCancelEditLink = useCallback(() => {
    setEditingLinkIdx(null);
    setEditLinkLabel('');
    setEditLinkUrl('');
  }, []);

  // -- Save / Cancel --------------------------------------------------------

  const handleSave = useCallback(() => {
    updateHomework(courseId, homeworkIndex, {
      title: title.trim() || initialTitle,
      dueDate,
      notes,
      links: links.map((l) => ({ ...l })),
    });
    onClose();
  }, [courseId, homeworkIndex, title, dueDate, notes, links, initialTitle, updateHomework, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // -- Render ---------------------------------------------------------------

  return (
    <div class="hw-edit-section">
      {/* Title */}
      <div class="hw-edit-row">
        <label class="hw-edit-label">Title:</label>
        <input
          type="text"
          class="hw-edit-input"
          value={title}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
        />
      </div>

      {/* Due Date */}
      <div class="hw-edit-row">
        <label class="hw-edit-label">Due:</label>
        <input
          type="date"
          class="hw-edit-input hw-edit-date"
          value={dueDate}
          onInput={(e) => setDueDate((e.target as HTMLInputElement).value)}
        />
      </div>

      {/* Links Section */}
      <div class="hw-edit-row">
        <label class="hw-edit-label">Links:</label>
      </div>

      {/* Existing links list */}
      {links.length > 0 && (
        <div class="hw-links-edit">
          {links.map((link, idx) => (
            <div key={`${link.url}-${idx}`} class="hw-link-edit-row">
              {editingLinkIdx === idx ? (
                <>
                  <input
                    type="text"
                    class="hw-link-edit-input hw-link-edit-label-input"
                    value={editLinkLabel}
                    onInput={(e) =>
                      setEditLinkLabel((e.target as HTMLInputElement).value)
                    }
                    placeholder="Label"
                  />
                  <input
                    type="text"
                    class="hw-link-edit-input hw-link-edit-url-input"
                    value={editLinkUrl}
                    onInput={(e) =>
                      setEditLinkUrl((e.target as HTMLInputElement).value)
                    }
                    placeholder="URL"
                  />
                  <button
                    type="button"
                    class="hw-link-save-btn"
                    onClick={handleSaveEditLink}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    class="hw-link-cancel-btn"
                    onClick={handleCancelEditLink}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span class="hw-link-edit-label">{link.label}</span>
                  <span class="hw-link-edit-url">{link.url}</span>
                  <button
                    type="button"
                    class="hw-link-edit-btn"
                    onClick={() => handleStartEditLink(idx)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    class="hw-link-remove-btn"
                    onClick={() => handleRemoveLink(idx)}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new link */}
      <div class="hw-add-link-row">
        <input
          type="text"
          class="hw-link-input"
          placeholder="Paste URL..."
          value={newLinkUrl}
          onInput={(e) => setNewLinkUrl((e.target as HTMLInputElement).value)}
        />
        <input
          type="text"
          class="hw-link-input hw-link-label"
          placeholder="Label (auto)"
          value={newLinkLabel}
          onInput={(e) => setNewLinkLabel((e.target as HTMLInputElement).value)}
        />
        <button type="button" class="hw-add-link-btn" onClick={handleAddLink}>
          Add
        </button>
      </div>

      {/* Notes */}
      <textarea
        class="hw-notes"
        placeholder="Add notes..."
        value={notes}
        onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
      />

      {/* Save / Cancel */}
      <div class="hw-edit-actions">
        <button type="button" class="hw-edit-save-btn" onClick={handleSave}>
          Save
        </button>
        <button
          type="button"
          class="hw-edit-cancel-btn"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a readable domain name from a URL to use as fallback label. */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.length > 30 ? url.slice(0, 30) + '…' : url;
  }
}
