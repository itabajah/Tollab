import { useState } from 'react'
import { getVideoEmbedInfo } from '@/lib/videoEmbed'
import { Spinner } from '@/components/ui/icons'

/**
 * Inline video preview. Renders a responsive 16:9 iframe for embeddable links
 * (YouTube / Panopto) with a loading spinner and an escape-hatch link (in case
 * the provider refuses to be framed); for anything else it degrades to an
 * external link so the user can still open the source in a new tab.
 */
export function EmbedPreview({ url }: { url: string }) {
  const { embedUrl } = getVideoEmbedInfo(url)
  const [loaded, setLoaded] = useState(false)

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
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-video w-full overflow-hidden rounded-control border border-line bg-black">
        {!loaded ? (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Spinner className="size-6 text-white/70" />
          </div>
        ) : null}
        <iframe
          src={embedUrl}
          title="Video preview"
          onLoad={() => setLoaded(true)}
          className="relative h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="self-start text-xs text-ink-faint underline hover:text-ink"
      >
        Trouble loading? Open in a new tab
      </a>
    </div>
  )
}
