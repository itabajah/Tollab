import { getVideoEmbedInfo } from '@/lib/videoEmbed'

/**
 * Inline video preview. Renders a responsive 16:9 iframe for embeddable links
 * (YouTube / Panopto); for anything else it degrades to an external link so the
 * user can still open the source in a new tab.
 */
export function EmbedPreview({ url }: { url: string }) {
  const { embedUrl } = getVideoEmbedInfo(url)

  if (embedUrl === null) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-accent underline hover:text-accent-hover"
      >
        Open video in a new tab
      </a>
    )
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xs border border-line bg-black">
      <iframe
        src={embedUrl}
        title="Video preview"
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}
