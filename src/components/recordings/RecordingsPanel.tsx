/**
 * RecordingsPanel — Main recordings UI within CourseModal.
 *
 * Renders the tab bar, sort dropdown, add-recording input,
 * and the list of RecordingItems for the active tab.
 */

import { useCallback, useState } from 'preact/hooks';

import { RECORDING_SORT_ORDERS } from '@/constants';
import { useAppStore } from '@/store/app-store';
import { useCourseById, useSortedRecordings } from '@/store/selectors';
import { useUiStore } from '@/store/ui-store';
import type { RecordingSortOrder } from '@/types';
import { getInputValue, getSelectValue } from '@/utils/dom';

import { RecordingItem } from './RecordingItem';
import { RecordingsTabs } from './RecordingsTabs';

/** Sort option labels shown in the dropdown. */
const SORT_LABELS: Record<RecordingSortOrder, string> = {
  default: 'Default (Numeric)',
  manual: 'Manual',
  name_asc: 'Name (A → Z)',
  name_desc: 'Name (Z → A)',
  watched_first: 'Watched First',
  unwatched_first: 'Unwatched First',
};

interface RecordingsPanelProps {
  courseId: string;
  onOpenFetchModal: () => void;
}

export function RecordingsPanel({ courseId, onOpenFetchModal }: RecordingsPanelProps) {
  const course = useCourseById(courseId);
  const activeTabIndex = useUiStore((s) => s.currentRecordingsTab);
  const tempRecordingEdit = useUiStore((s) => s.tempRecordingEdit);
  const showWatchedRecordings = useAppStore((s) => s.settings.showWatchedRecordings);
  const setRecordingSortOrder = useAppStore((s) => s.setRecordingSortOrder);
  const addRecording = useAppStore((s) => s.addRecording);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [newLink, setNewLink] = useState('');
  const [newLinkError, setNewLinkError] = useState('');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const tabs = course?.recordings.tabs ?? [];
  const activeTab = tabs[activeTabIndex];
  const tabId = activeTab?.id ?? '';

  // Current sort order for this tab
  const sortOrders = useAppStore((s) => s.recordingSortOrders);
  const currentSort: RecordingSortOrder =
    (sortOrders[courseId]?.[tabId] as RecordingSortOrder | undefined) ?? 'default';

  // Sorted recordings via selector
  const sortedRecordings = useSortedRecordings(courseId, activeTabIndex);

  // Filter out watched if setting is off
  const visibleRecordings = showWatchedRecordings
    ? sortedRecordings
    : sortedRecordings.filter((r) => !r.item.watched);

  const handleSortChange = useCallback(
    (e: Event) => {
      const order = getSelectValue(e) as RecordingSortOrder;
      setRecordingSortOrder(courseId, tabId, order);
    },
    [courseId, tabId, setRecordingSortOrder],
  );

  const handleAddRecording = useCallback(() => {
    const link = newLink.trim();
    if (!link || !tabId) {
      if (!link) setNewLinkError('Please enter a video link.');
      return;
    }

    setNewLinkError('');

    // Auto-generate name from URL or use generic name
    const tabItemCount = activeTab?.items.length ?? 0;
    const name = `Recording ${tabItemCount + 1}`;

    addRecording(courseId, tabId, {
      name,
      videoLink: link,
      slideLink: '',
      watched: false,
    });
    setNewLink('');
  }, [courseId, tabId, newLink, activeTab, addRecording]);

  const handleAddKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleAddRecording();
    },
    [handleAddRecording],
  );

  const handlePreviewToggle = useCallback(
    (index: number) => {
      setPreviewIndex((prev) => (prev === index ? null : index));
    },
    [],
  );

  const handleToggleShowWatched = useCallback(() => {
    updateSettings({ showWatchedRecordings: !showWatchedRecordings });
  }, [showWatchedRecordings, updateSettings]);

  if (!course) return null;

  return (
    <div className="course-tab-panel active">
      {/* Tabs + actions */}
      <RecordingsTabs
        courseId={courseId}
        tabs={tabs}
        activeTabIndex={activeTabIndex}
        showWatched={showWatchedRecordings}
        onToggleShowWatched={handleToggleShowWatched}
        onOpenFetchModal={onOpenFetchModal}
      />

      {/* Sort controls */}
      <div className="list-sort-controls">
        <span className="sort-label">Sort:</span>
        <select
          className="sort-select"
          value={currentSort}
          onChange={handleSortChange}
          aria-label="Sort recordings"
        >
          {(Object.keys(RECORDING_SORT_ORDERS) as (keyof typeof RECORDING_SORT_ORDERS)[]).map(
            (key) => {
              const value = RECORDING_SORT_ORDERS[key];
              return (
                <option key={value} value={value}>
                  {SORT_LABELS[value]}
                </option>
              );
            },
          )}
        </select>
      </div>

      {/* Recordings list */}
      <div className="recordings-list">
        {visibleRecordings.length === 0 && (
          <div className="recordings-empty">
            {sortedRecordings.length > 0
              ? 'All recordings are watched. Toggle "Show Done" to see them.'
              : 'No recordings yet. Paste a video link below or import from YouTube/Panopto.'}
          </div>
        )}
        {visibleRecordings.map(({ item, originalIndex }, i) => {
          const isEditing =
            tempRecordingEdit !== null &&
            tempRecordingEdit.tabIndex === activeTabIndex &&
            tempRecordingEdit.recordingIndex === originalIndex;

          return (
            <RecordingItem
              key={`${tabId}-${originalIndex}`}
              courseId={courseId}
              tabId={tabId}
              tabIndex={activeTabIndex}
              originalIndex={originalIndex}
              recording={item}
              isFirst={i === 0}
              isLast={i === visibleRecordings.length - 1}
              isEditing={isEditing}
              previewIndex={previewIndex}
              onPreviewToggle={handlePreviewToggle}
              sortOrder={currentSort}
            />
          );
        })}
      </div>

      {/* Add recording */}
      <div className="recordings-add-section">
        <input
          type="text"
          className={`recordings-add-input${newLinkError ? ' input-error' : ''}`}
          placeholder="Paste video link (YouTube, Panopto, etc.)..."
          value={newLink}
          onInput={(e) => { setNewLink(getInputValue(e)); setNewLinkError(''); }}
          onKeyDown={handleAddKeyDown}
        />
        <button
          type="button"
          className="btn-primary recordings-add-btn"
          onClick={handleAddRecording}
        >
          Add
        </button>
      </div>
      {newLinkError && (
        <div className="validation-error" role="alert">{newLinkError}</div>
      )}
    </div>
  );
}
