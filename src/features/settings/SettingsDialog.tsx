import * as Tabs from '@radix-ui/react-tabs'
import { Dialog } from '@/components/ui/Dialog'
import { ProfileTab } from './ProfileTab'
import { AppearanceTab } from './AppearanceTab'
import { CalendarTab } from './CalendarTab'
import { FetchDataTab } from './FetchDataTab'

const tabTrigger =
  'rounded-xs border border-transparent px-3 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink data-[state=active]:border-line data-[state=active]:bg-inset data-[state=active]:text-ink'

export type SettingsTab = 'profile' | 'appearance' | 'calendar' | 'fetch'

export function SettingsDialog({
  open,
  onOpenChange,
  initialTab = 'profile',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Which tab to open on. Defaults to Profile; the empty-state opens on "fetch". */
  initialTab?: SettingsTab
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Settings" wide>
      <Tabs.Root defaultValue={initialTab}>
        <Tabs.List
          className="mb-4 flex gap-1 border-b border-line pb-2"
          aria-label="Settings sections"
        >
          <Tabs.Trigger value="profile" className={tabTrigger}>
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger value="appearance" className={tabTrigger}>
            Appearance
          </Tabs.Trigger>
          <Tabs.Trigger value="calendar" className={tabTrigger}>
            Calendar
          </Tabs.Trigger>
          <Tabs.Trigger value="fetch" className={tabTrigger}>
            Fetch Data
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="profile" className="min-h-[22rem] focus-visible:outline-none">
          <ProfileTab />
        </Tabs.Content>
        <Tabs.Content value="appearance" className="min-h-[22rem] focus-visible:outline-none">
          <AppearanceTab />
        </Tabs.Content>
        <Tabs.Content value="calendar" className="min-h-[22rem] focus-visible:outline-none">
          <CalendarTab />
        </Tabs.Content>
        <Tabs.Content value="fetch" className="min-h-[22rem] focus-visible:outline-none">
          <FetchDataTab />
        </Tabs.Content>
      </Tabs.Root>
    </Dialog>
  )
}
