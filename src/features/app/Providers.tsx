import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useAppState } from '@/hooks/session'
import { ToastProvider } from '@/components/ui/Toast'
import { ConfirmProvider } from '@/components/ui/ConfirmProvider'
import type { Session } from '@/store/session'

/** Keeps the document theme attribute in sync with the active profile's settings. */
function ThemeSync() {
  const theme = useAppState((s) => s.data.settings.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return null
}

export function Providers({ session, children }: { session: Session; children: ReactNode }) {
  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <ConfirmProvider>
          <ThemeSync />
          {children}
        </ConfirmProvider>
      </ToastProvider>
    </SessionProvider>
  )
}
