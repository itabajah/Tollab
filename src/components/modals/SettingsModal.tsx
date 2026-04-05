/**
 * Settings modal with 4-tab container.
 *
 * Tabs: Profile, Appearance, Calendar, Fetch Data
 * Uses the base Modal component from Wave 5.
 */

import { useCallback, useState } from 'preact/hooks';

import { Modal } from './Modal';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { AppearanceTab } from '@/components/settings/AppearanceTab';
import { CalendarTab } from '@/components/settings/CalendarTab';
import { FetchDataTab } from '@/components/settings/FetchDataTab';

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------

type SettingsTabId = 'profile' | 'appearance' | 'calendar' | 'sync';

interface TabDef {
  id: SettingsTabId;
  label: string;
  icon: () => preact.JSX.Element;
}

function ProfileIcon() {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function AppearanceIcon() {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m-5.196-11.196l4.243 4.242m0 0l4.242 4.242M1 12h6m6 0h6M7.757 7.757L3.515 3.515m0 0l4.242 4.242m8.485 8.486L20.485 20.485" />
    </svg>
  );
}

function CalendarIcon() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function SyncIcon() {
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
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

const TABS: readonly TabDef[] = [
  { id: 'profile', label: 'Profile', icon: ProfileIcon },
  { id: 'appearance', label: 'Appearance', icon: AppearanceIcon },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'sync', label: 'Fetch Data', icon: SyncIcon },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('profile');

  const handleTabClick = useCallback((tabId: SettingsTabId) => {
    setActiveTab(tabId);
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      {/* Tab Navigation */}
      <div class="settings-modal-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              class={`settings-modal-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
              type="button"
            >
              <Icon />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div
        class={`settings-tab-panel${activeTab === 'profile' ? ' active' : ''}`}
      >
        {activeTab === 'profile' && <ProfileTab />}
      </div>
      <div
        class={`settings-tab-panel${activeTab === 'appearance' ? ' active' : ''}`}
      >
        {activeTab === 'appearance' && <AppearanceTab />}
      </div>
      <div
        class={`settings-tab-panel${activeTab === 'calendar' ? ' active' : ''}`}
      >
        {activeTab === 'calendar' && <CalendarTab />}
      </div>
      <div
        class={`settings-tab-panel${activeTab === 'sync' ? ' active' : ''}`}
      >
        {activeTab === 'sync' && <FetchDataTab />}
      </div>
    </Modal>
  );
}
