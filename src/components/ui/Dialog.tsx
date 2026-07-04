import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Visually hidden description for screen readers; optional. */
  description?: string
  wide?: boolean
  children: ReactNode
}

/** Modal dialog matching the legacy look: dim overlay, small radius, sticky title. */
export function Dialog({ open, onOpenChange, title, description, wide, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-[fade-in_0.2s]" />
        <RadixDialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[95vw] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xs border border-line bg-panel shadow-[0_4px_12px_rgba(0,0,0,0.15)] focus:outline-none data-[state=open]:animate-[dialog-in_0.25s_ease-out]',
            wide ? 'max-w-[700px]' : 'max-w-[440px]',
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <RadixDialog.Title className="text-base font-semibold text-ink">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Close"
              className="rounded-xs px-1.5 text-xl leading-none text-ink-faint transition-colors hover:text-ink"
            >
              &times;
            </RadixDialog.Close>
          </div>
          {description ? (
            <RadixDialog.Description className="sr-only">{description}</RadixDialog.Description>
          ) : null}
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex items-center justify-end gap-2">{children}</div>
}
