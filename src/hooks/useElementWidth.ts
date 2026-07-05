import { useEffect, useState, type RefObject } from 'react'

/**
 * Tracks an element's content width via ResizeObserver. Returns 0 until the
 * element is measured (and in jsdom, where the observer is a no-op) — callers
 * treat 0 as "unknown" and fall back to a sensible default.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => setWidth(element.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return width
}
