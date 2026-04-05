/**
 * FetchVideosModal — Import videos from YouTube playlists or Panopto folders.
 *
 * YouTube: paste playlist URL → fetch → select videos → import.
 * Panopto: run console script → paste JSON → parse → select videos → import.
 */

import { useCallback, useState } from 'preact/hooks';

import { CORS_PROXIES } from '@/constants';
import { useAppStore } from '@/store/app-store';
import type { RecordingItem } from '@/types';

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
// YouTube parsing helpers
// ---------------------------------------------------------------------------

const PANOPTO_SCRIPT =
  `copy(JSON.stringify([...document.querySelectorAll('tr[aria-label][id]')].filter(r=>/^[a-f0-9-]{36}$/i.test(r.id)).map(r=>({t:r.getAttribute('aria-label'),u:location.origin+'/Panopto/Pages/Viewer.aspx?id='+r.id}))))`;

function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&#]+)/);
  return match?.[1] ?? null;
}

function parseYouTubeHtml(html: string): FetchedVideo[] {
  const videos: FetchedVideo[] = [];
  // Look for video data in the HTML using common playlist patterns
  const titleRegex = /\"title\":\{\"runs\":\[\{\"text\":\"(.*?)\"\}\]/g;
  const idRegex = /\"videoId\":\"([A-Za-z0-9_-]{11})\"/g;

  const titles: string[] = [];
  const ids: string[] = [];

  let match;
  while ((match = titleRegex.exec(html)) !== null) {
    if (match[1]) titles.push(match[1]);
  }
  while ((match = idRegex.exec(html)) !== null) {
    if (match[1] && !ids.includes(match[1])) ids.push(match[1]);
  }

  // Pair titles with IDs
  const count = Math.min(titles.length, ids.length);
  for (let i = 0; i < count; i++) {
    videos.push({
      title: titles[i]!,
      url: `https://www.youtube.com/watch?v=${ids[i]}`,
      selected: true,
    });
  }

  // If regex approach didn't work, try simpler pattern
  if (videos.length === 0) {
    const simpleRegex = /watch\?v=([A-Za-z0-9_-]{11})/g;
    const seenIds = new Set<string>();
    while ((match = simpleRegex.exec(html)) !== null) {
      const id = match[1];
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        videos.push({
          title: `Video ${videos.length + 1}`,
          url: `https://www.youtube.com/watch?v=${id}`,
          selected: true,
        });
      }
    }
  }

  return videos;
}

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
    const listId = extractPlaylistId(playlistUrl);
    if (!listId) {
      setStatus('Invalid playlist URL. Must contain ?list=...');
      return;
    }

    setLoading(true);
    setStatus('Fetching playlist...');
    setVideos([]);

    const targetUrl = `https://www.youtube.com/playlist?list=${listId}`;

    for (const proxyFn of CORS_PROXIES) {
      try {
        const proxyUrl = proxyFn(targetUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) continue;

        const html = await response.text();
        const parsed = parseYouTubeHtml(html);

        if (parsed.length > 0) {
          setVideos(parsed);
          setStatus(`Found ${parsed.length} videos`);
          setLoading(false);
          return;
        }
      } catch {
        // Try next proxy
      }
    }

    setStatus('Could not fetch playlist. Try a different URL or use Panopto import.');
    setLoading(false);
  }, [playlistUrl]);

  // -- Panopto parse --------------------------------------------------------

  const handleParsePanopto = useCallback(() => {
    try {
      const data = JSON.parse(panoptoData) as Array<{ t: string; u: string }>;
      if (!Array.isArray(data) || data.length === 0) {
        setStatus('No videos found in pasted data.');
        return;
      }
      const parsed: FetchedVideo[] = data.map((item) => ({
        title: item.t || 'Untitled',
        url: item.u || '',
        selected: true,
      }));
      setVideos(parsed);
      setStatus(`Parsed ${parsed.length} videos`);
    } catch {
      setStatus('Invalid JSON data. Make sure you copied the output from the console script.');
    }
  }, [panoptoData]);

  // -- Copy panopto script --------------------------------------------------

  const handleCopyScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PANOPTO_SCRIPT);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = PANOPTO_SCRIPT;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    }
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

    setStatus(`Imported ${selected.length} videos!`);
    // Reset and close after short delay
    setTimeout(() => {
      setVideos([]);
      setStatus('');
      setPlaylistUrl('');
      setPanoptoData('');
      onClose();
    }, 1000);
  }, [videos, useOriginalNames, existingCount, courseId, tabId, addRecording, onClose]);

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
            setSource((e.target as HTMLSelectElement).value as FetchSource);
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
              onInput={(e) => setPlaylistUrl((e.target as HTMLInputElement).value)}
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
              onInput={(e) => setPanoptoData((e.target as HTMLTextAreaElement).value)}
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
      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
        <input
          type="checkbox"
          checked={useOriginalNames}
          onChange={() => setUseOriginalNames((prev) => !prev)}
          style={{ width: 'auto', margin: '0' }}
        />
        <label style={{ margin: '0', textTransform: 'none', fontSize: '14px' }}>
          Use original video titles
        </label>
      </div>

      {/* Status */}
      {status && (
        <div style={{ margin: '12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {status}
        </div>
      )}

      {/* Video selection checklist */}
      {videos.length > 0 && (
        <div className="panopto-extracted-list">
          <div className="panopto-extracted-header">
            <span>{selectedCount} of {videos.length} selected</span>
            <div style={{ display: 'flex', gap: '8px' }}>
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
          className="btn-primary"
          onClick={handleImport}
          disabled={selectedCount === 0}
          style={{ marginTop: '12px', width: '100%' }}
        >
          Import {selectedCount} Video{selectedCount !== 1 ? 's' : ''}
        </button>
      )}
    </Modal>
  );
}
