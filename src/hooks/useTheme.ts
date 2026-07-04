import { useCallback, useState } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'tollab:ui:theme'

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage unavailable (private mode) — theme still applies for the session.
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = getStoredTheme()
    document.documentElement.dataset.theme = stored
    return stored
  })

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light'
      applyTheme(next)
      return next
    })
  }, [])

  return [theme, toggle]
}
