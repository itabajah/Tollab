import { useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { SAVE_ERROR_EVENT } from './saveError'

/**
 * Surfaces a failed local write (e.g. storage quota exceeded) as a toast.
 * localStorage is the source of truth between sessions, so a silent save failure
 * risks data loss with no warning. The session keeps retrying on the next flush;
 * a single throttled toast tells the user without spamming one per retry.
 */
export function SaveErrorWatcher() {
  const toast = useToast()
  useEffect(() => {
    let cooldown = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const handler = () => {
      if (cooldown) return
      cooldown = true
      toast.error('Couldn’t save your changes', {
        description: 'Your device storage may be full. Tollab will keep trying in the background.',
      })
      timer = setTimeout(() => {
        cooldown = false
      }, 30_000)
    }
    window.addEventListener(SAVE_ERROR_EVENT, handler)
    return () => {
      window.removeEventListener(SAVE_ERROR_EVENT, handler)
      if (timer) clearTimeout(timer)
    }
  }, [toast])
  return null
}
