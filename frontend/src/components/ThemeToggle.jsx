'use client'

export const THEME_KEY = 'pointswap_theme'

/*
  Light/dark switch.

  Deliberately stateless. The theme lives in one place -- the data-theme attribute
  on <html>, set before first paint by the inline script in layout.js -- and this
  button reads and writes it directly. Both icons are always rendered and CSS picks
  which is visible (see .theme-icon-* in globals.css).

  That avoids the usual trap: holding the theme in React state means the server
  renders one icon and the client another, so you need a mounted flag and a
  setState in an effect to dodge a hydration mismatch. With CSS doing the swap the
  server and client markup are identical and no effect is needed.
*/
export default function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Private mode or blocked storage: the change still applies to this page view.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="w-10 h-10 glass rounded-full flex items-center justify-center premium-shadow hover:scale-110 transition-all ripple text-ink-2 shrink-0"
    >
      {/* shown in light mode: click to go dark */}
      <svg className="theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
      </svg>
      {/* shown in dark mode: click to go light */}
      <svg className="theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
      </svg>
    </button>
  )
}
