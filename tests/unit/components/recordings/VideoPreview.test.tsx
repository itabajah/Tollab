/**
 * Tests for VideoPreview component.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';
import { VideoPreview } from '@/components/recordings/VideoPreview';
import type { VideoEmbedInfo } from '@/utils/video';

function renderPreview(embedInfo: VideoEmbedInfo, onClose = vi.fn()) {
  return { ...render(<VideoPreview embedInfo={embedInfo} onClose={onClose} />), onClose };
}

describe('VideoPreview', () => {
  it('renders null when embedUrl is empty', () => {
    const { container } = renderPreview({ embedUrl: '', platform: 'youtube' });
    expect(container.innerHTML).toBe('');
  });

  it('renders null when embedUrl is null-ish', () => {
    const { container } = renderPreview({ embedUrl: null as unknown as string, platform: 'youtube' });
    expect(container.innerHTML).toBe('');
  });

  it('renders iframe with correct src for YouTube', () => {
    renderPreview({ embedUrl: 'https://youtube.com/embed/abc', platform: 'youtube' });
    const iframe = screen.getByTitle('YouTube Preview');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toBe('https://youtube.com/embed/abc');
  });

  it('displays "YouTube Preview" label', () => {
    renderPreview({ embedUrl: 'https://youtube.com/embed/abc', platform: 'youtube' });
    expect(screen.getByText('YouTube Preview')).toBeInTheDocument();
  });

  it('displays "Panopto Preview" label for panopto', () => {
    renderPreview({ embedUrl: 'https://panopto.com/embed/abc', platform: 'panopto' });
    expect(screen.getByText('Panopto Preview')).toBeInTheDocument();
  });

  it('displays "Video Preview" label for unknown platform', () => {
    renderPreview({ embedUrl: 'https://other.com/embed', platform: 'other' as 'youtube' });
    expect(screen.getByText('Video Preview')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const { onClose } = renderPreview({ embedUrl: 'https://youtube.com/embed/abc', platform: 'youtube' });
    fireEvent.click(screen.getByLabelText('Close preview'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('iframe has correct attributes', () => {
    renderPreview({ embedUrl: 'https://youtube.com/embed/abc', platform: 'youtube' });
    const iframe = screen.getByTitle('YouTube Preview');
    expect(iframe.getAttribute('allow')).toBe('autoplay; fullscreen; picture-in-picture');
    expect(iframe).toHaveAttribute('allowfullscreen');
  });

  it('has correct CSS classes', () => {
    const { container } = renderPreview({ embedUrl: 'https://youtube.com/embed/abc', platform: 'youtube' });
    expect(container.querySelector('.recording-preview-container')).toBeTruthy();
    expect(container.querySelector('.recording-preview-header')).toBeTruthy();
    expect(container.querySelector('.recording-preview-iframe')).toBeTruthy();
  });
});
