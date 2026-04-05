/**
 * RecordingItem — Single recording entry in the recordings list.
 *
 * Shows watched checkbox, name, video/slides links, edit button,
 * reorder buttons, and optional inline video preview.
 */

import { memo } from 'preact/compat';
import { useCallback } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import { useUiStore } from '@/store/ui-store';
import type { RecordingItem as RecordingItemType } from '@/types';
import { handleKeyActivate } from '@/utils/dom';
import { getVideoEmbedInfo, supportsInlinePreview } from '@/utils/video';

import { RecordingEditor } from './RecordingEditor';
import { VideoPreview } from './VideoPreview';

interface RecordingItemProps {
  courseId: string;
  tabId: string;
  tabIndex: number;
  /** Original array index used for store mutations. */
  originalIndex: number;
  recording: RecordingItemType;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  /** Index of the recording whose preview is open, or null. */
  previewIndex: number | null;
  onPreviewToggle: (index: number) => void;
  sortOrder: string;
}

export const RecordingItem = memo(function RecordingItem({
  courseId,
  tabId,
  tabIndex,
  originalIndex,
  recording,
  isFirst,
  isLast,
  isEditing,
  previewIndex,
  onPreviewToggle,
  sortOrder,
}: RecordingItemProps) {
  const toggleRecordingWatched = useAppStore((s) => s.toggleRecordingWatched);
  const deleteRecording = useAppStore((s) => s.deleteRecording);
  const reorderRecording = useAppStore((s) => s.reorderRecording);
  const setTempRecordingEdit = useUiStore((s) => s.setTempRecordingEdit);

  const canEmbed = supportsInlinePreview(recording.videoLink);
  const isPreviewOpen = previewIndex === originalIndex;
  const embedInfo = getVideoEmbedInfo(recording.videoLink);

  const handleToggleWatched = useCallback(() => {
    toggleRecordingWatched(courseId, tabId, originalIndex);
  }, [courseId, tabId, originalIndex, toggleRecordingWatched]);

  const handleDelete = useCallback(() => {
    deleteRecording(courseId, tabId, originalIndex);
  }, [courseId, tabId, originalIndex, deleteRecording]);

  const handleEdit = useCallback(() => {
    setTempRecordingEdit({ tabIndex, recordingIndex: originalIndex });
  }, [tabIndex, originalIndex, setTempRecordingEdit]);

  const handleCloseEdit = useCallback(() => {
    setTempRecordingEdit(null);
  }, [setTempRecordingEdit]);

  const handleMoveUp = useCallback(() => {
    reorderRecording(courseId, tabId, originalIndex, 'up');
  }, [courseId, tabId, originalIndex, reorderRecording]);

  const handleMoveDown = useCallback(() => {
    reorderRecording(courseId, tabId, originalIndex, 'down');
  }, [courseId, tabId, originalIndex, reorderRecording]);

  const handleContentClick = useCallback(() => {
    if (canEmbed) {
      onPreviewToggle(originalIndex);
    } else if (recording.videoLink) {
      window.open(recording.videoLink, '_blank', 'noopener,noreferrer');
    }
  }, [canEmbed, recording.videoLink, originalIndex, onPreviewToggle]);

  const handleClosePreview = useCallback(() => {
    onPreviewToggle(originalIndex);
  }, [originalIndex, onPreviewToggle]);

  const itemClass = `recording-item${recording.watched ? ' watched' : ''}`;

  if (isEditing) {
    return (
      <div className={itemClass}>
        <RecordingEditor
          courseId={courseId}
          tabId={tabId}
          recordingIndex={originalIndex}
          recording={recording}
          onClose={handleCloseEdit}
        />
      </div>
    );
  }

  return (
    <div className={itemClass}>
      {/* Reorder buttons (only in manual sort) */}
      {sortOrder === 'manual' && (
        <div className="item-reorder-buttons">
          <button
            type="button"
            className="reorder-btn"
            disabled={isFirst}
            onClick={handleMoveUp}
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            className="reorder-btn"
            disabled={isLast}
            onClick={handleMoveDown}
            aria-label="Move down"
          >
            ▼
          </button>
        </div>
      )}

      <div className="recording-header">
        {/* Watched checkbox */}
        <input
          type="checkbox"
          className="recording-checkbox"
          checked={recording.watched}
          onChange={handleToggleWatched}
          aria-label={`Mark "${recording.name}" as ${recording.watched ? 'unwatched' : 'watched'}`}
        />

        <div className="recording-content">
          {/* Clickable content area (opens preview or external link) */}
          <div
            className={canEmbed ? 'recording-content-clickable' : undefined}
            onClick={handleContentClick}
            role={canEmbed ? 'button' : undefined}
            tabIndex={canEmbed ? 0 : undefined}
            onKeyDown={
              canEmbed
                ? handleKeyActivate(handleContentClick)
                : undefined
            }
          >
            <div className="recording-name">
              {canEmbed && (
                <span className={`recording-play-icon${embedInfo.platform === 'youtube' ? '' : ' recording-preview-icon'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </span>
              )}
              <span>{recording.name}</span>
              {canEmbed && (
                <span className="recording-preview-hint">
                  {isPreviewOpen ? 'Click to close' : 'Click to preview'}
                </span>
              )}
            </div>
          </div>

          {/* Link chips */}
          <div className="recording-meta">
            {recording.videoLink && (
              <a
                className="recording-link recording-link-video"
                href={recording.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Video
              </a>
            )}
            {recording.slideLink && (
              <a
                className="recording-link recording-link-slides"
                href={recording.slideLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Slides
              </a>
            )}
          </div>

          {/* Inline video preview */}
          {isPreviewOpen && embedInfo.embedUrl && (
            <VideoPreview embedInfo={embedInfo} onClose={handleClosePreview} />
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="recording-actions">
        <button
          type="button"
          className="recording-action-btn"
          onClick={handleEdit}
          title="Edit recording"
        >
          ✎
        </button>
        <button
          type="button"
          className="recording-action-btn recording-action-btn-danger"
          onClick={handleDelete}
          title="Delete recording"
        >
          &times;
        </button>
      </div>
    </div>
  );
});
