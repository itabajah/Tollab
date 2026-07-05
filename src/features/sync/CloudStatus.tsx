import { useSyncController, useSyncState } from '@/hooks/syncContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

const STATUS_LABEL: Record<string, string> = {
  unavailable: 'Cloud sync unavailable',
  idle: 'Not connected',
  connecting: 'Connecting…',
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline',
  error: 'Sync error',
}

/** Compact connection indicator for the header (mobile shows the dot only). */
export function CloudHeaderStatus() {
  const status = useSyncState((s) => s.status)
  const email = useSyncState((s) => s.userEmail)
  const label = status === 'synced' && email ? `Synced` : STATUS_LABEL[status]
  return (
    <span className="text-xs text-ink-faint" data-cloud-status={status}>
      {label}
    </span>
  )
}

/** The full cloud-sync block for the Settings → Profile tab. */
export function CloudStatus() {
  const controller = useSyncController()
  const status = useSyncState((s) => s.status)
  const email = useSyncState((s) => s.userEmail)
  const toast = useToast()

  if (!controller || status === 'unavailable') {
    return (
      <p className="text-xs text-ink-faint">
        Cloud sync is unavailable in this build. Your data is saved locally.
      </p>
    )
  }

  const signedIn = email !== null

  const connect = async () => {
    try {
      await controller.signIn()
    } catch {
      toast.error('Sign-in failed')
    }
  }

  const disconnect = async () => {
    await controller.signOut()
    toast.info('Signed out of cloud sync')
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink">
        {signedIn ? (
          <>
            Synced as <span className="font-medium">{email}</span>
          </>
        ) : (
          STATUS_LABEL[status]
        )}
      </p>
      {signedIn ? (
        <Button variant="secondary" onClick={() => void disconnect()}>
          Disconnect
        </Button>
      ) : (
        <Button variant="primary" onClick={() => void connect()}>
          Sign in with Google
        </Button>
      )}
    </div>
  )
}
