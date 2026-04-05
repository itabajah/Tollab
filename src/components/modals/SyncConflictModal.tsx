/**
 * Sync conflict resolution modal.
 *
 * Shown when local and cloud data diverge on sign-in or remote update.
 * Presents three options: Use Cloud Data, Use Local Data, Merge Both.
 * Returns the user's choice via the `onResolve` callback.
 */

import { useCallback, useRef } from 'preact/hooks';
import type { SyncConflictInfo, SyncConflictResolution } from '@/types';
import { useFocusTrap } from './useFocusTrap';

interface SyncConflictModalProps {
  isOpen: boolean;
  conflict: SyncConflictInfo | null;
  onResolve: (choice: SyncConflictResolution | null) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString();
}

// SVG icons matching the legacy sync-conflict-modal in index.legacy.html

function CloudIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      class="sync-conflict-icon"
    >
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      <polyline points="13 13 9 17 7 15" />
    </svg>
  );
}

function LocalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      class="sync-conflict-icon"
    >
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function MergeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      class="sync-conflict-icon"
    >
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  );
}

export function SyncConflictModal({ isOpen, conflict, onResolve }: SyncConflictModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { handleTabKey } = useFocusTrap(modalRef, isOpen);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onResolve(null);
        return;
      }
      handleTabKey(e);
    },
    [onResolve, handleTabKey],
  );

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if (e.target === overlayRef.current) onResolve(null);
    },
    [onResolve],
  );

  if (!isOpen || !conflict) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay active"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div ref={modalRef} className="modal" role="alertdialog" aria-modal="true" aria-label="Sync Conflict Detected">
        <div className="modal-header">
          <h2 className="modal-title">⚠️ Sync Conflict Detected</h2>
        </div>

        <div className="modal-body">
          <p class="sync-conflict-description">
            The cloud data is different from your local data. How would you like to resolve this?
          </p>

          {/* Conflict details summary */}
          <div class="sync-conflict-summary">
            <div class="sync-conflict-summary-row">
              <strong>Local:</strong> {conflict.localProfileCount} profile{conflict.localProfileCount !== 1 ? 's' : ''}
              {conflict.localLastModified ? ` · Last modified ${formatDate(conflict.localLastModified)}` : ''}
            </div>
            <div>
              <strong>Cloud:</strong> {conflict.cloudProfileCount} profile{conflict.cloudProfileCount !== 1 ? 's' : ''}
              {conflict.cloudLastModified ? ` · Last modified ${formatDate(conflict.cloudLastModified)}` : ''}
            </div>
          </div>

          {/* Resolution buttons */}
          <div class="sync-conflict-options">
            <button
              className="btn-primary sync-conflict-option-btn"
              type="button"
              onClick={() => onResolve('use_cloud')}
            >
              <CloudIcon />
              <div>
                <div class="sync-conflict-option-label">Use Cloud Data</div>
                <div class="sync-conflict-option-desc">Replace local data with cloud data (your local changes will be lost)</div>
              </div>
            </button>

            <button
              className="btn-secondary sync-conflict-option-btn"
              type="button"
              onClick={() => onResolve('use_local')}
            >
              <LocalIcon />
              <div>
                <div class="sync-conflict-option-label">Use Local Data</div>
                <div class="sync-conflict-option-desc">Upload local data to cloud (cloud data will be overwritten)</div>
              </div>
            </button>

            <button
              className="btn-secondary sync-conflict-option-btn"
              type="button"
              onClick={() => onResolve('merge')}
            >
              <MergeIcon />
              <div>
                <div class="sync-conflict-option-label">Merge Both</div>
                <div class="sync-conflict-option-desc">Combine data from both sources (recommended if no duplicates)</div>
              </div>
            </button>

            <button
              className="btn-secondary sync-conflict-cancel-btn"
              type="button"
              onClick={() => onResolve(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
