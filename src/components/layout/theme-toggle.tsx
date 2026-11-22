'use client'
import { Sun, Moon } from 'lucide-react'
import { useTheme, Theme } from '@/store/theme-store'
export function ThemeToggle({ initial }: { initial: Theme }) {
  const { theme, setTheme } = useTheme(),
    dark = (theme || initial) === 'dark'
  return (
    <button
      className="square theme-toggle"
      aria-label={dark ? 'Use light theme' : 'Use deep water theme'}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
