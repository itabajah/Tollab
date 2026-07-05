import { useEffect, type RefObject } from 'react'

/**
 * Briefly draws attention to a deep-linked element: when `active` becomes true
 * the referenced node scrolls into view and gets a `data-highlight` attribute
 * (styled as a short pulse in theme.css, disabled under reduced motion) that
 * clears itself after ~1.5s. Used by the ticker/calendar deep-links to point at
 * the specific homework item or exam field they opened.
 */
export function useHighlight(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return
    // scrollIntoView is absent in jsdom and some embedded webviews — best-effort.
    el.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    el.setAttribute('data-highlight', 'true')
    const id = setTimeout(() => el.removeAttribute('data-highlight'), 1500)
    return () => {
      clearTimeout(id)
      el.removeAttribute('data-highlight')
    }
  }, [ref, active])
}
