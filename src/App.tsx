import { useTheme } from '@/hooks/useTheme'

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function App() {
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="min-h-screen px-5 py-10 md:px-10">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-logo bg-gradient-to-br from-accent to-ink-muted bg-clip-text text-[44px] tracking-[4px] text-transparent transition-transform hover:scale-[1.02]">
            Tollab
          </h1>
          <p className="text-sm text-ink-faint">For Technionez</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            className="rounded-xs border border-line bg-panel p-2 text-ink-muted transition-colors hover:bg-inset hover:text-ink"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>
    </div>
  )
}
