import { useState } from 'react'
import { useSyncController, useSyncState } from '@/hooks/syncContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface StatusMeta {
  label: string
  dot: string
  pulse?: boolean
}

const STATUS_META: Record<string, StatusMeta> = {
  unavailable: { label: 'Cloud sync unavailable', dot: 'bg-ink-faint' },
  idle: { label: 'Not connected', dot: 'bg-ink-faint' },
  connecting: { label: 'Connecting…', dot: 'bg-status-warning', pulse: true },
  syncing: { label: 'Syncing…', dot: 'bg-status-warning', pulse: true },
  synced: { label: 'Synced', dot: 'bg-status-success' },
  offline: { label: 'Offline', dot: 'bg-ink-faint' },
  error: { label: 'Sync error', dot: 'bg-status-error' },
}

const metaFor = (status: string): StatusMeta => STATUS_META[status] ?? STATUS_META.idle!

function StatusDot({ status }: { status: string }) {
  const meta = metaFor(status)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        meta.dot,
        meta.pulse && 'animate-pulse',
      )}
    />
  )
}

/** A Google auth popup the user simply dismissed — not a real failure. */
function isPopupCancel(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
}

/** Compact connection indicator for the header: a colored dot at all breakpoints
 * plus a label that hides on mobile. Driven by the live status, not sign-in. */
export function CloudHeaderStatus() {
  const status = useSyncState((s) => s.status)
  const email = useSyncState((s) => s.userEmail)
  const label = status === 'synced' && email ? 'Synced' : metaFor(status).label
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint" title={label}>
      <StatusDot status={status} />
      <span className="max-md:hidden">{label}</span>
    </span>
  )
}

/** The full cloud-sync block for the Settings → Profile tab. */
export function CloudStatus() {
  const controller = useSyncController()
  const status = useSyncState((s) => s.status)
  const email = useSyncState((s) => s.userEmail)
  const toast = useToast()
  const [pending, setPending] = useState(false)

  if (!controller || status === 'unavailable') {
    return (
      <p className="text-xs text-ink-faint">
        Cloud sync is unavailable in this build. Your data is saved locally.
      </p>
    )
  }

  const signedIn = email !== null
  const meta = metaFor(status)

  const connect = async () => {
    setPending(true)
    try {
      await controller.signIn()
    } catch (error) {
      // A dismissed popup is a deliberate cancel, not an error worth alarming over.
      if (!isPopupCancel(error)) {
        toast.error('Couldn’t reach Google — check your connection and try again.')
      }
    } finally {
      setPending(false)
    }
  }

  const disconnect = async () => {
    setPending(true)
    try {
      await controller.signOut()
      toast.info('Signed out of cloud sync')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Label + dot reflect the LIVE status (syncing / offline / error), with the
          account as a secondary detail — so failures aren't masked by "Synced". */}
      <p className="flex items-center gap-2 text-sm text-ink">
        <StatusDot status={status} />
        {signedIn ? (
          <span>
            {meta.label} — <span className="font-medium">{email}</span>
          </span>
        ) : (
          meta.label
        )}
      </p>
      {signedIn ? (
        <Button variant="secondary" loading={pending} onClick={() => void disconnect()}>
          Disconnect
        </Button>
      ) : (
        <Button variant="primary" loading={pending} onClick={() => void connect()}>
          Sign in with Google
        </Button>
      )}
    </div>
  )
}
