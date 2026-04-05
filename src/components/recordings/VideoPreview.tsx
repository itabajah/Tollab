/**
 * VideoPreview — Inline iframe embed for YouTube/Panopto videos.
 *
 * Only one preview may be open at a time (controlled by parent).
 * Uses getVideoEmbedInfo from utils/video to detect platform and build embed URL.
 */

import type { VideoEmbedInfo } from '@/utils/video';

interface VideoPreviewProps {
  embedInfo: VideoEmbedInfo;
  onClose: () => void;
}

export function VideoPreview({ embedInfo, onClose }: VideoPreviewProps) {
  if (!embedInfo.embedUrl) return null;

  const platformLabel =
    embedInfo.platform === 'youtube'
      ? 'YouTube Preview'
      : embedInfo.platform === 'panopto'
        ? 'Panopto Preview'
        : 'Video Preview';

  return (
    <div className="recording-preview-container">
      <div className="recording-preview-header">
        <span>{platformLabel}</span>
        <button
          type="button"
          className="recording-preview-close"
          onClick={onClose}
          aria-label="Close preview"
        >
          &times;
        </button>
      </div>
      <iframe
        className="recording-preview-iframe"
        src={embedInfo.embedUrl}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title={platformLabel}
      />
    </div>
  );
}
