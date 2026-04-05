/**
 * Profile management tab within the settings modal.
 *
 * Features:
 * - Profile selector dropdown (switch between profiles)
 * - Rename profile (inline edit)
 * - Cloud sync section (shows sign-in status — Hana will add actual buttons)
 * - Export profile button (downloads JSON)
 * - Import profile button (file upload, validates, creates new profile)
 * - Delete profile button (with confirmation, can't delete last profile)
 */

import { useCallback, useRef, useState } from 'preact/hooks';

import { useProfileStore } from '@/store/profile-store';
import { Button, Select } from '@/components/ui';
import type { SelectOption } from '@/components/ui';

// ---------------------------------------------------------------------------
// SVG Icons (matching legacy index.legacy.html)
// ---------------------------------------------------------------------------

function CloudIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileTab() {
  const profiles = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const switchProfile = useProfileStore((s) => s.switchProfile);
  const renameProfile = useProfileStore((s) => s.renameProfile);
  const createProfile = useProfileStore((s) => s.createProfile);
  const deleteProfile = useProfileStore((s) => s.deleteProfile);
  const exportProfile = useProfileStore((s) => s.exportProfile);
  const importProfile = useProfileStore((s) => s.importProfile);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const profileOptions: SelectOption[] = profiles.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const handleSwitch = useCallback(
    (id: string) => {
      switchProfile(id);
    },
    [switchProfile],
  );

  const handleNewProfile = useCallback(() => {
    const name = `Profile ${profiles.length + 1}`;
    createProfile(name);
  }, [profiles.length, createProfile]);

  const handleStartRename = useCallback(() => {
    const active = profiles.find((p) => p.id === activeProfileId);
    if (active) {
      setRenameValue(active.name);
      setIsRenaming(true);
    }
  }, [profiles, activeProfileId]);

  const handleSaveRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== profiles.find((p) => p.id === activeProfileId)?.name) {
      renameProfile(activeProfileId, trimmed);
    }
    setIsRenaming(false);
  }, [renameValue, activeProfileId, profiles, renameProfile]);

  const handleRenameKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveRename();
      } else if (e.key === 'Escape') {
        setIsRenaming(false);
      }
    },
    [handleSaveRename],
  );

  const handleExport = useCallback(() => {
    const json = exportProfile(activeProfileId);
    if (!json) return;

    const active = profiles.find((p) => p.id === activeProfileId);
    const safeName = (active?.name ?? 'profile').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `tollab-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeProfileId, profiles, exportProfile]);

  const handleImportClick = useCallback(() => {
    setImportError(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text !== 'string') return;

        const newId = importProfile(text);
        if (newId) {
          setImportError(null);
          switchProfile(newId);
        } else {
          setImportError('Invalid profile file. Please check the format.');
        }
      };
      reader.onerror = () => {
        setImportError('Error reading file. Please try again.');
      };
      reader.readAsText(file);

      // Reset so the same file can be re-selected
      target.value = '';
    },
    [importProfile, switchProfile],
  );

  const handleDeleteClick = useCallback(() => {
    if (profiles.length <= 1) {
      setConfirmDelete(false);
      return;
    }
    setConfirmDelete(true);
  }, [profiles.length]);

  const handleConfirmDelete = useCallback(() => {
    deleteProfile(activeProfileId);
    setConfirmDelete(false);
  }, [activeProfileId, deleteProfile]);

  return (
    <div class="settings-tab-content">
      {/* Active Profile Section */}
      <div class="form-group">
        <div class="form-row">
          <h3 class="settings-section-title">Active Profile</h3>
          <Button variant="secondary" onClick={handleNewProfile}>
            + New Profile
          </Button>
        </div>
      </div>

      <div class="form-group">
        {isRenaming ? (
          <div class="form-row">
            <input
              type="text"
              class="form-control"
              value={renameValue}
              onInput={(e) => setRenameValue((e.target as HTMLInputElement).value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleSaveRename}
              autoFocus
              aria-label="Profile name"
            />
            <Button variant="primary" onClick={handleSaveRename}>
              Save
            </Button>
          </div>
        ) : (
          <div class="form-row">
            <Select
              options={profileOptions}
              value={activeProfileId}
              onChange={handleSwitch}
              aria-label="Select profile"
            />
            <Button variant="secondary" onClick={handleStartRename}>
              ✎
            </Button>
          </div>
        )}
      </div>

      {/* Cloud Sync Section */}
      <div class="form-group">
        <h4 class="settings-subsection-title">
          <CloudIcon />
          Cloud Sync (Google Sign-In)
        </h4>
        <div class="form-group">
          <span>Status: </span>
          <span id="cloud-status-text">Not connected</span>
        </div>
        <p class="settings-description">
          Sign in to sync your profiles across devices using Firebase Realtime Database.
        </p>
        {/* Hana will add the actual sign-in/disconnect buttons here */}
      </div>

      {/* Local Data Management */}
      <div class="form-group">
        <h4 class="settings-subsection-title">Local Data Management</h4>
        <div class="form-row">
          <Button variant="secondary" onClick={handleExport}>
            <ExportIcon /> Export
          </Button>
          <Button variant="secondary" onClick={handleImportClick}>
            <ImportIcon /> Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            class="hidden"
            aria-label="Import profile file"
          />
        </div>
        {importError && <p class="form-error">{importError}</p>}
      </div>

      {/* Delete Profile */}
      <div class="form-group">
        {confirmDelete ? (
          <div class="form-row">
            <span class="error-text">Delete this profile permanently?</span>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Confirm Delete
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="danger"
            onClick={handleDeleteClick}
            disabled={profiles.length <= 1}
          >
            <TrashIcon /> Delete Profile
          </Button>
        )}
      </div>
    </div>
  );
}
