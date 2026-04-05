import { useCallback, useState } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import { SettingsModal } from '@/components/modals';
import { FirebaseSyncState } from '@/types';

// ---------------------------------------------------------------------------
// SVG icons — identical to index.legacy.html
// ---------------------------------------------------------------------------

function SunIcon() {
  return (
    <svg
      class="theme-icon-sun"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      class="theme-icon-moon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Cloud status helpers
// ---------------------------------------------------------------------------

function CloudSyncIcon({ state }: { state: FirebaseSyncState }) {
  const size = 14;
  const style = { verticalAlign: 'middle' as const, marginRight: 4 };

  switch (state) {
    case FirebaseSyncState.Synced:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--green, #22c55e)" stroke-width="2" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <polyline points="13 13 9 17 7 15" />
        </svg>
      );
    case FirebaseSyncState.Syncing:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
    case FirebaseSyncState.Error:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--red, #ef4444)" stroke-width="2" style={style}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    default:
      return null;
  }
}

function cloudStatusLabel(state: FirebaseSyncState, email?: string | null): string {
  switch (state) {
    case FirebaseSyncState.Synced:
      return email ? `Synced (${email})` : 'Synced';
    case FirebaseSyncState.Syncing:
      return 'Syncing…';
    case FirebaseSyncState.Error:
      return 'Sync error';
    default:
      return 'Not connected';
  }
}

/** Props for Header when wired to useFirebaseSync. */
export interface HeaderSyncProps {
  syncState?: FirebaseSyncState;
  userEmail?: string | null;
}

// ---------------------------------------------------------------------------
// Header component
// ---------------------------------------------------------------------------

export function Header({
  syncState = FirebaseSyncState.Disconnected,
  userEmail,
}: HeaderSyncProps = {}) {
  const theme = useAppStore((s) => s.settings.theme);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
    document.body.classList.toggle('dark-mode', next === 'dark');
  };

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const label = cloudStatusLabel(syncState, userEmail);

  return (
    <header>
      <div class="brand">
        <h1>Tollab</h1>
        <span class="brand-subtitle">For Technionez</span>
      </div>
      <div class="header-controls">
        <span
          id="cloud-header-text"
          class="cloud-status-text"
        >
          <CloudSyncIcon state={syncState} />
          {label}
        </span>
        <button
          id="theme-toggle-btn"
          class="icon-btn"
          title="Toggle Theme"
          onClick={handleToggleTheme}
        >
          <SunIcon />
          <MoonIcon />
        </button>
        <button
          id="settings-btn"
          class="icon-btn"
          title="Settings"
          onClick={handleOpenSettings}
        >
          <SettingsIcon />
        </button>
      </div>
      <SettingsModal isOpen={settingsOpen} onClose={handleCloseSettings} />
    </header>
  );
}
