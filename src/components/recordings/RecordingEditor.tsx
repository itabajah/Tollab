/**
 * RecordingEditor — Inline editor for a recording item.
 *
 * Replaces the recording item view when editing is active.
 * Edits name, video link, and slides link. Save/cancel buttons.
 */

import { useCallback, useState } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import type { RecordingItem } from '@/types';

interface RecordingEditorProps {
  courseId: string;
  tabId: string;
  recordingIndex: number;
  recording: RecordingItem;
  onClose: () => void;
}

export function RecordingEditor({
  courseId,
  tabId,
  recordingIndex,
  recording,
  onClose,
}: RecordingEditorProps) {
  const updateRecording = useAppStore((s) => s.updateRecording);

  const [editName, setEditName] = useState(recording.name);
  const [editVideo, setEditVideo] = useState(recording.videoLink);
  const [editSlides, setEditSlides] = useState(recording.slideLink);

  const handleSave = useCallback(() => {
    updateRecording(courseId, tabId, recordingIndex, {
      name: editName.trim() || recording.name,
      videoLink: editVideo.trim(),
      slideLink: editSlides.trim(),
    });
    onClose();
  }, [
    courseId, tabId, recordingIndex, editName, editVideo, editSlides,
    recording.name, updateRecording, onClose,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') onClose();
    },
    [handleSave, onClose],
  );

  return (
    <div className="recording-edit-section">
      <div className="recording-edit-row">
        <label className="recording-edit-label">Name</label>
        <input
          className="recording-edit-input"
          type="text"
          value={editName}
          onInput={(e) => setEditName((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="recording-edit-row">
        <label className="recording-edit-label">Video</label>
        <input
          className="recording-edit-input"
          type="url"
          value={editVideo}
          placeholder="Video URL..."
          onInput={(e) => setEditVideo((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="recording-edit-row">
        <label className="recording-edit-label">Slides</label>
        <input
          className="recording-edit-input"
          type="url"
          value={editSlides}
          placeholder="Slides URL..."
          onInput={(e) => setEditSlides((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="recording-edit-actions">
        <button type="button" className="recording-edit-save-btn" onClick={handleSave}>
          Save
        </button>
        <button type="button" className="recording-edit-cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
