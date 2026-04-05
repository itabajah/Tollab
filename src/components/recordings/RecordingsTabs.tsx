/**
 * RecordingsTabs — Tab bar for recording sub-tabs within a course.
 *
 * Displays tab buttons with count badges and an "add tab" button.
 * Provides rename, delete, and clear actions for the active tab.
 */

import { useCallback, useState } from 'preact/hooks';

import { PROTECTED_TAB_IDS } from '@/constants';
import { useAppStore } from '@/store/app-store';
import { useUiStore } from '@/store/ui-store';
import type { RecordingTab } from '@/types';

interface RecordingsTabsProps {
  courseId: string;
  tabs: RecordingTab[];
  activeTabIndex: number;
  showWatched: boolean;
  onToggleShowWatched: () => void;
  onOpenFetchModal: () => void;
}

export function RecordingsTabs({
  courseId,
  tabs,
  activeTabIndex,
  showWatched,
  onToggleShowWatched,
  onOpenFetchModal,
}: RecordingsTabsProps) {
  const setRecordingsTab = useUiStore((s) => s.setRecordingsTab);
  const addRecordingTab = useAppStore((s) => s.addRecordingTab);
  const renameRecordingTab = useAppStore((s) => s.renameRecordingTab);
  const deleteRecordingTab = useAppStore((s) => s.deleteRecordingTab);
  const clearRecordingTab = useAppStore((s) => s.clearRecordingTab);

  const [actionsExpanded, setActionsExpanded] = useState(false);

  const activeTab = tabs[activeTabIndex];
  const isProtected = activeTab ? PROTECTED_TAB_IDS.has(activeTab.id) : true;

  const handleAddTab = useCallback(() => {
    const name = prompt('Tab name:');
    if (!name?.trim()) return;
    addRecordingTab(courseId, name.trim());
    setRecordingsTab(tabs.length);
  }, [courseId, tabs.length, addRecordingTab, setRecordingsTab]);

  const handleRenameTab = useCallback(() => {
    if (!activeTab) return;
    const name = prompt('Rename tab:', activeTab.name);
    if (!name?.trim() || name.trim() === activeTab.name) return;
    renameRecordingTab(courseId, activeTab.id, name.trim());
  }, [courseId, activeTab, renameRecordingTab]);

  const handleDeleteTab = useCallback(() => {
    if (!activeTab || isProtected) return;
    if (!confirm(`Delete tab "${activeTab.name}" and all its recordings?`)) return;
    deleteRecordingTab(courseId, activeTab.id);
    setRecordingsTab(Math.max(0, activeTabIndex - 1));
  }, [courseId, activeTab, isProtected, activeTabIndex, deleteRecordingTab, setRecordingsTab]);

  const handleClearTab = useCallback(() => {
    if (!activeTab) return;
    if (!confirm(`Remove all recordings from "${activeTab.name}"?`)) return;
    clearRecordingTab(courseId, activeTab.id);
  }, [courseId, activeTab, clearRecordingTab]);

  const toggleActions = useCallback(() => {
    setActionsExpanded((prev) => !prev);
  }, []);

  return (
    <div className="recordings-control-panel">
      {/* Tab row */}
      <div className="recordings-tabs-row">
        <div className="recordings-tabs">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              className={`recordings-tab${i === activeTabIndex ? ' active' : ''}`}
              onClick={() => setRecordingsTab(i)}
            >
              {tab.name}
              <span className="recordings-tab-count">{tab.items.length}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="recordings-tab-add"
          onClick={handleAddTab}
          title="Add Custom Tab"
        >
          +
        </button>
      </div>

      {/* Collapsible actions toggle */}
      <button
        type="button"
        className="recordings-control-panel-toggle"
        onClick={toggleActions}
      >
        <span>Recording Actions</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Actions row */}
      <div className={`recordings-control-panel-content${actionsExpanded ? ' expanded' : ''}`}>
        <div className="recordings-actions-row">
          <button
            type="button"
            className="recordings-tab-add recordings-tab-add-mobile"
            title="Add Custom Tab"
            onClick={handleAddTab}
          >
            +
          </button>

          {/* Import button */}
          <button
            type="button"
            className="recordings-action-btn primary"
            title="Import from YouTube/Panopto"
            onClick={onOpenFetchModal}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Import from YouTube/Panopto</span>
          </button>

          <div className="recordings-actions-divider" />

          {/* Rename */}
          <button
            type="button"
            className="recordings-action-btn"
            title="Rename Tab"
            onClick={handleRenameTab}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
            <span>Rename</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            className="recordings-action-btn"
            title="Clear All Videos"
            onClick={handleClearTab}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
            <span>Clear</span>
          </button>

          {/* Delete tab */}
          <button
            type="button"
            className={`recordings-action-btn danger${isProtected ? '' : ''}`}
            title="Delete Tab"
            disabled={isProtected}
            onClick={handleDeleteTab}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>Delete</span>
          </button>

          <div className="recordings-actions-spacer" />

          {/* Show watched toggle */}
          <label className="recordings-show-watched-toggle">
            <input
              type="checkbox"
              checked={showWatched}
              onChange={onToggleShowWatched}
            />
            <span>Show Done</span>
          </label>
        </div>
      </div>
    </div>
  );
}
