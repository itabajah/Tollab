import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { IconButton } from './IconButton'
import { CloseIcon } from './icons'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Visually hidden description for screen readers; optional. */
  description?: string
  wide?: boolean
  /** Optional sticky footer (outside the scroll area) for primary actions. */
  footer?: ReactNode
  children: ReactNode
}

/** Modal dialog: dim + blurred overlay, token elevation, sticky title, in/out animation. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  wide,
  footer,
  children,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=closed]:animate-[fade-out_var(--duration-fast)_var(--ease-standard)] data-[state=open]:animate-[fade-in_var(--duration-base)_var(--ease-standard)]" />
        <RadixDialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[95vw] -translate-x-1/2 -translate-y-1/2 flex-col rounded-overlay border border-line bg-panel shadow-lg focus:outline-none data-[state=closed]:animate-[dialog-out_var(--duration-fast)_var(--ease-standard)] data-[state=open]:animate-[dialog-in_var(--duration-base)_var(--ease-emphasized)]',
            wide ? 'max-w-[700px]' : 'max-w-[440px]',
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <RadixDialog.Title className="text-base font-semibold text-ink">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close asChild>
              <IconButton aria-label="Close" variant="ghost" size="sm" className="-mr-1.5">
                <CloseIcon />
              </IconButton>
            </RadixDialog.Close>
          </div>
          {description ? (
            <RadixDialog.Description className="sr-only">{description}</RadixDialog.Description>
          ) : null}
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
              {footer}
            </div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex items-center justify-end gap-2">{children}</div>
}
