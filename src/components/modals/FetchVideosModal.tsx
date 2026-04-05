/**
 * FetchVideosModal — Import videos from YouTube playlists or Panopto folders.
 *
 * YouTube: paste playlist URL → fetch via service → select videos → import.
 * Panopto: run console script → paste JSON → parse via service → select → import.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { useToast } from '@/components/toast/ToastContext';
import { parsePanoptoClipboard } from '@/services/panopto';
import { fetchYouTubePlaylist } from '@/services/youtube';
import type { YouTubeVideo } from '@/services/youtube';
import { useAppStore } from '@/store/app-store';
import type { RecordingItem } from '@/types';
import { ToastType } from '@/types';
import { getInputValue, getSelectValue, getTextAreaValue } from '@/utils/dom';

import { Modal } from '../modals/Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FetchedVideo {
  title: string;
  url: string;
  selected: boolean;
}

type FetchSource = 'youtube' | 'panopto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PANOPTO_SCRIPT =
  `copy(JSON.stringify([...document.querySelectorAll('tr[aria-label][id]')].filter(r=>/^[a-f0-9-]{36}$/i.test(r.id)).map(r=>({t:r.getAttribute('aria-label'),u:location.origin+'/Panopto/Pages/Viewer.aspx?id='+r.id}))))`;

const SCRIPT_COPIED_TIMEOUT_MS = 2000;
const IMPORT_CLOSE_DELAY_MS = 1000;
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FetchVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  tabId: string;
  existingCount: number;
}

export function FetchVideosModal({
  isOpen,
  onClose,
  courseId,
  tabId,
  existingCount,
}: FetchVideosModalProps) {
  const addRecording = useAppStore((s) => s.addRecording);
  const { showToast } = useToast();

  const scriptCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (scriptCopiedTimerRef.current !== null) clearTimeout(scriptCopiedTimerRef.current);
      if (importCloseTimerRef.current !== null) clearTimeout(importCloseTimerRef.current);
    };
  }, []);

  const [source, setSource] = useState<FetchSource>('youtube');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [panoptoData, setPanoptoData] = useState('');
  const [videos, setVideos] = useState<FetchedVideo[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [useOriginalNames, setUseOriginalNames] = useState(true);
  const [scriptCopied, setScriptCopied] = useState(false);

  // -- YouTube fetch --------------------------------------------------------

  const handleFetchYouTube = useCallback(async () => {
    if (!playlistUrl.trim()) {
      setStatus('Please enter a playlist URL.');
      return;
    }

    setLoading(true);
    setStatus('Fetching playlist...');
    setVideos([]);

    try {
      const ytVideos: YouTubeVideo[] = await fetchYouTubePlaylist(
        playlistUrl,
        (proxyIndex, totalProxies, proxyStatus) => {
          setStatus(
            proxyStatus === 'trying'
              ? `Trying proxy ${String(proxyIndex)}/${String(totalProxies)}...`
              : `Retrying proxy ${String(proxyIndex)}/${String(totalProxies)}...`,
          );
        },
      );

      if (ytVideos.length > 0) {
        const fetched: FetchedVideo[] = ytVideos.map((v) => ({
          title: v.title,
          url: v.url,
          selected: true,
        }));
        setVideos(fetched);
        setStatus(`Found ${String(fetched.length)} videos`);
        showToast(
          `Found ${String(fetched.length)} videos in playlist`,
          ToastType.Success,
        );
      } else {
        setStatus('No videos found in the playlist.');
        showToast('No videos found in playlist', ToastType.Warning);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch playlist';
      setStatus(message);
      showToast('YouTube fetch failed', ToastType.Error, {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [playlistUrl, showToast]);

  // -- Panopto parse --------------------------------------------------------

  const handleParsePanopto = useCallback(() => {
    try {
      // First try the service's structured parser (supports SessionId/SessionName format)
      try {
        const serviceVideos = parsePanoptoClipboard(panoptoData);
        if (serviceVideos.length > 0) {
          const parsed: FetchedVideo[] = serviceVideos.map((v) => ({
            title: v.title,
            url: v.url,
            selected: true,
          }));
          setVideos(parsed);
          setStatus(`Parsed ${String(parsed.length)} videos`);
          showToast(
            `Parsed ${String(parsed.length)} Panopto videos`,
            ToastType.Success,
          );
          return;
        }
      } catch {
        // Service parser failed — try legacy console script format
      }

      // Fallback: legacy console script format { t, u }
      const raw: unknown = JSON.parse(panoptoData);
      if (!Array.isArray(raw) || raw.length === 0) {
        setStatus('No videos found in pasted data.');
        showToast('No videos found in pasted data', ToastType.Warning);
        return;
      }
      const data = raw as Array<Record<string, unknown>>;
      const parsed: FetchedVideo[] = data.map((item) => ({
        title: typeof item['t'] === 'string' ? item['t'] || 'Untitled' : 'Untitled',
        url: typeof item['u'] === 'string' ? item['u'] || '' : '',
        selected: true,
      }));
      setVideos(parsed);
      setStatus(`Parsed ${String(parsed.length)} videos`);
      showToast(
        `Parsed ${String(parsed.length)} Panopto videos`,
        ToastType.Success,
      );
    } catch {
      setStatus(
        'Invalid JSON data. Make sure you copied the output from the console script.',
      );
      showToast('Invalid Panopto data', ToastType.Error, {
        description:
          'Could not parse the pasted data. Make sure you copied the console script output.',
      });
    }
  }, [panoptoData, showToast]);

  // -- Copy panopto script --------------------------------------------------

  const handleCopyScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PANOPTO_SCRIPT);
    } catch {
      // Fallback for insecure contexts or denied permissions
      const textArea = document.createElement('textarea');
      textArea.value = PANOPTO_SCRIPT;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textArea);
      }
    }
    setScriptCopied(true);
    if (scriptCopiedTimerRef.current !== null) clearTimeout(scriptCopiedTimerRef.current);
    scriptCopiedTimerRef.current = setTimeout(() => setScriptCopied(false), SCRIPT_COPIED_TIMEOUT_MS);
  }, []);

  // -- Selection ------------------------------------------------------------

  const handleToggleVideo = useCallback((index: number) => {
    setVideos((prev) =>
      prev.map((v, i) => (i === index ? { ...v, selected: !v.selected } : v)),
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setVideos((prev) => prev.map((v) => ({ ...v, selected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setVideos((prev) => prev.map((v) => ({ ...v, selected: false })));
  }, []);

  // -- Import ---------------------------------------------------------------

  const handleImport = useCallback(() => {
    const selected = videos.filter((v) => v.selected);
    if (selected.length === 0) {
      setStatus('No videos selected.');
      return;
    }

    selected.forEach((video, i) => {
      const recording: RecordingItem = {
        name: useOriginalNames ? video.title : `Recording ${existingCount + i + 1}`,
        videoLink: video.url,
        slideLink: '',
        watched: false,
      };
      addRecording(courseId, tabId, recording);
    });

    showToast(
      `Imported ${String(selected.length)} video${selected.length !== 1 ? 's' : ''}`,
      ToastType.Success,
    );
    setStatus(`Imported ${String(selected.length)} videos!`);
    // Reset and close after short delay
    if (importCloseTimerRef.current !== null) clearTimeout(importCloseTimerRef.current);
    importCloseTimerRef.current = setTimeout(() => {
      setVideos([]);
      setStatus('');
      setPlaylistUrl('');
      setPanoptoData('');
      onClose();
    }, IMPORT_CLOSE_DELAY_MS);
  }, [videos, useOriginalNames, existingCount, courseId, tabId, addRecording, onClose, showToast]);

  // -- Close handler --------------------------------------------------------

  const handleClose = useCallback(() => {
    setVideos([]);
    setStatus('');
    setPlaylistUrl('');
    setPanoptoData('');
    setLoading(false);
    onClose();
  }, [onClose]);

  const selectedCount = videos.filter((v) => v.selected).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Videos">
      {/* Source selector */}
      <div className="form-group">
        <label>Source</label>
        <select
          value={source}
          onChange={(e) => {
            setSource(getSelectValue(e) as FetchSource);
            setVideos([]);
            setStatus('');
          }}
        >
          <option value="youtube">YouTube Playlist</option>
          <option value="panopto">Panopto Folder</option>
        </select>
      </div>

      {/* YouTube section */}
      {source === 'youtube' && (
        <div>
          <div className="form-group">
            <label>Playlist URL</label>
            <input
              type="url"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={playlistUrl}
              onInput={(e) => setPlaylistUrl(getInputValue(e))}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleFetchYouTube}
            disabled={loading || !playlistUrl.trim()}
          >
            {loading ? 'Fetching...' : 'Fetch Videos'}
          </button>
        </div>
      )}

      {/* Panopto section */}
      {source === 'panopto' && (
        <div>
          <div className="panopto-import-guide">
            <p><strong>Quick Import (3 steps):</strong></p>
            <ol>
              <li>Open your Panopto folder in a new tab (scroll to load all videos)</li>
              <li>
                Press <kbd>F12</kbd> → Console → paste this code and press Enter:
              </li>
            </ol>
            <div className="panopto-script-box">
              <code>{PANOPTO_SCRIPT}</code>
              <button
                type="button"
                className={`panopto-copy-btn${scriptCopied ? ' copied' : ''}`}
                title="Copy script"
                onClick={handleCopyScript}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
            <ol start={3}>
              <li>Paste here (<kbd>Ctrl+V</kbd>):</li>
            </ol>
          </div>

          <div className="form-group">
            <textarea
              className="panopto-paste-area"
              placeholder="Paste the copied JSON data here..."
              value={panoptoData}
              onInput={(e) => setPanoptoData(getTextAreaValue(e))}
            />
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleParsePanopto}
            disabled={!panoptoData.trim()}
          >
            Parse Video Data
          </button>
        </div>
      )}

      {/* Use original names toggle */}
      <div className="form-group fetch-names-toggle">
        <input
          type="checkbox"
          checked={useOriginalNames}
          onChange={() => setUseOriginalNames((prev) => !prev)}
          className="fetch-names-checkbox"
        />
        <label className="fetch-names-label">
          Use original video titles
        </label>
      </div>

      {/* Status */}
      {status && (
        <div className="fetch-status">
          {status}
        </div>
      )}

      {/* Video selection checklist */}
      {videos.length > 0 && (
        <div className="panopto-extracted-list">
          <div className="panopto-extracted-header">
            <span>{selectedCount} of {videos.length} selected</span>
            <div className="fetch-select-actions">
              <button type="button" className="btn-link" onClick={handleSelectAll}>
                Select All
              </button>
              <button type="button" className="btn-link" onClick={handleDeselectAll}>
                Deselect All
              </button>
            </div>
          </div>
          <div className="panopto-video-list">
            {videos.map((video, i) => (
              <div key={`${video.url}-${i}`} className="panopto-video-item">
                <input
                  type="checkbox"
                  checked={video.selected}
                  onChange={() => handleToggleVideo(i)}
                  id={`fetch-video-${i}`}
                />
                <label for={`fetch-video-${i}`}>{video.title}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import button */}
      {videos.length > 0 && (
        <button
          type="button"
          className="btn-primary fetch-import-btn"
          onClick={handleImport}
          disabled={selectedCount === 0}
        >
          Import {selectedCount} Video{selectedCount !== 1 ? 's' : ''}
        </button>
      )}
    </Modal>
  );
}
