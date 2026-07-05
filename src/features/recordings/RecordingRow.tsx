import { useState } from 'react'
import type { RecordingItem, RecordingSort } from '@/domain/model'
import { supportsInlinePreview } from '@/lib/videoEmbed'
import { useAppActions } from '@/hooks/session'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field, Input } from '@/components/ui/Field'
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { EmbedPreview } from './EmbedPreview'

interface RecordingRowProps {
  courseId: string
  tabId: string
  item: RecordingItem
  sort: RecordingSort
  isFirst: boolean
  isLast: boolean
}

function Chevron({ dir }: { dir: 'up' | 'down' }) {
  const Icon = dir === 'up' ? ChevronUpIcon : ChevronDownIcon
  return <Icon width={12} height={12} strokeWidth={2.5} />
}

/**
 * A single recording: watched toggle, name, video/slides links, and an inline
 * embed preview when the link is embeddable. Edit and delete live on the right
 * (revealed on hover/focus); manual reorder controls appear only under 'manual'.
 */
export function RecordingRow({ courseId, tabId, item, sort, isFirst, isLast }: RecordingRowProps) {
  const { toggleRecording, updateRecording, removeRecording, moveRecording } = useAppActions()
  const confirm = useConfirm()
  const [playing, setPlaying] = useState(false)
  const [editing, setEditing] = useState(false)

  const label = item.name || 'Recording'
  const embeddable = item.videoLink !== '' && supportsInlinePreview(item.videoLink)
  const manual = sort === 'manual'

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete Recording',
      message: `Delete "${label}"?`,
      confirmLabel: 'Delete',
      dangerous: true,
    })
    if (!ok) return
    removeRecording(courseId, tabId, item.id)
  }

  const onSaveEdit = (patch: { name: string; videoLink: string; slideLink: string }) => {
    updateRecording(courseId, tabId, item.id, patch)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="rounded-card border border-line bg-panel p-3 shadow-sm">
        <RecordingEditForm item={item} onSave={onSaveEdit} onCancel={() => setEditing(false)} />
      </li>
    )
  }

  return (
    <li className="group rounded-card border border-line bg-panel p-3 shadow-sm transition-shadow duration-150 hover:shadow-md">
      <div className="flex items-start gap-3">
        <Checkbox
          className="mt-1"
          checked={item.watched}
          aria-label={`${label} watched`}
          onCheckedChange={() => toggleRecording(courseId, tabId, item.id)}
        />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-sm break-words text-ink',
              item.watched && 'text-ink-faint line-through',
            )}
            title={item.name || undefined}
          >
            {item.name || <span className="text-ink-faint italic">Untitled recording</span>}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {embeddable ? (
              <Button size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)}>
                {playing ? 'Hide' : 'Preview'}
              </Button>
            ) : item.videoLink !== '' ? (
              <a
                href={item.videoLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-control text-sm text-accent underline hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
              >
                Open video
              </a>
            ) : (
              <span className="text-xs text-ink-faint">No video link</span>
            )}
            {item.slideLink !== '' ? (
              <a
                href={item.slideLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-control text-sm text-accent underline hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
              >
                Slides
              </a>
            ) : null}
          </div>

          {playing && embeddable ? (
            <div className="mt-2">
              <EmbedPreview url={item.videoLink} />
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
          {manual ? (
            <>
              <IconButton
                aria-label={`Move ${label} up`}
                disabled={isFirst}
                variant="ghost"
                size="sm"
                onClick={() => moveRecording(courseId, tabId, item.id, -1)}
              >
                <Chevron dir="up" />
              </IconButton>
              <IconButton
                aria-label={`Move ${label} down`}
                disabled={isLast}
                variant="ghost"
                size="sm"
                onClick={() => moveRecording(courseId, tabId, item.id, 1)}
              >
                <Chevron dir="down" />
              </IconButton>
            </>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <IconButton
            aria-label={`Delete ${label}`}
            danger
            variant="ghost"
            size="sm"
            onClick={() => void onDelete()}
          >
            <CloseIcon width={14} height={14} />
          </IconButton>
        </div>
      </div>
    </li>
  )
}

function RecordingEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: RecordingItem
  onSave: (patch: { name: string; videoLink: string; slideLink: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(item.name)
  const [videoLink, setVideoLink] = useState(item.videoLink)
  const [slideLink, setSlideLink] = useState(item.slideLink)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ name: name.trim(), videoLink: videoLink.trim(), slideLink: slideLink.trim() })
      }}
    >
      <Field label="Name">
        {(id) => <Input id={id} value={name} autoFocus onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Video URL">
        {(id) => <Input id={id} value={videoLink} onChange={(e) => setVideoLink(e.target.value)} />}
      </Field>
      <Field label="Slides URL">
        {(id) => <Input id={id} value={slideLink} onChange={(e) => setSlideLink(e.target.value)} />}
      </Field>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm">
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
