'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
export function RouteFocus() {
  const path = usePathname(),
    last = useRef(path)
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  useEffect(() => {
    const previous = last.current
    if (previous === path) return
    last.current = path
    const root = document.documentElement
    const sheetClose = root.dataset.sheetClosing
    const settle = sheetClose
      ? window.setTimeout(() => {
          if (root.dataset.sheetClosing === sheetClose) delete root.dataset.sheetClosing
        }, 420)
      : null
    const frame = requestAnimationFrame(() => {
      if (document.querySelector('dialog[open]')) return
      const card =
        previous.startsWith('/events/') && ['/', '/events'].includes(path)
          ? Array.from(document.querySelectorAll<HTMLAnchorElement>('.card-main')).find(
              (a) => a.pathname === previous,
            )
          : null
      if (card) {
        card.focus({ preventScroll: true })
        return
      }
      const h = document.querySelector<HTMLElement>('main h1')
      if (h) {
        h.tabIndex = -1
        h.focus({ preventScroll: true })
      }
    })
    return () => {
      cancelAnimationFrame(frame)
      if (settle !== null) window.clearTimeout(settle)
    }
  }, [path])
  return null
}
