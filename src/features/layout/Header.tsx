import { useState } from 'react'
import { useAppActions, useAppState } from '@/hooks/session'
import { IconButton } from '@/components/ui/IconButton'
import { GearIcon, MoonIcon, SunIcon } from '@/components/ui/icons'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { CloudHeaderStatus } from '@/features/sync/CloudStatus'

export function Header() {
  const theme = useAppState((s) => s.data.settings.theme)
  const { updateSettings } = useAppActions()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex select-none items-baseline gap-2.5">
        <h1 className="font-logo bg-gradient-to-br from-accent to-ink-muted bg-clip-text text-[clamp(28px,5vw,44px)] tracking-[4px] text-transparent">
          Tollab
        </h1>
        <p className="text-sm text-ink-faint max-md:hidden">For Technionez</p>
      </div>
      <div className="flex items-center gap-2">
        <CloudHeaderStatus />
        <IconButton
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          onClick={() => updateSettings({ theme: theme === 'light' ? 'dark' : 'light' })}
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </IconButton>
        <IconButton aria-label="Settings" onClick={() => setSettingsOpen(true)}>
          <GearIcon />
        </IconButton>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  )
}
