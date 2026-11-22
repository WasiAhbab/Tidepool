'use client'
import { create } from 'zustand'
export type Theme = 'light' | 'dark'
export const useTheme = create<{ theme: Theme | undefined; setTheme: (theme: Theme) => void }>(
  (set) => ({
    theme: undefined,
    setTheme: (theme) => {
      document.documentElement.dataset.theme = theme
      document.cookie = 'tp_theme=' + theme + '; Path=/; Max-Age=31536000; SameSite=Lax'
      set({ theme })
    },
  }),
)
