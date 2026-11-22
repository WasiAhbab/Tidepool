'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog } from '@/components/ui/dialog'
import { flip } from '@/lib/flip'
export function InviteSheet({ slug, children }: { slug: string; children: React.ReactNode }) {
  const router = useRouter(),
    pathname = usePathname(),
    expected = '/events/' + encodeURIComponent(slug)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const sync = () => setVisible(location.pathname === expected)
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [expected, pathname])
  useEffect(() => {
    const from = flip.from
    flip.from = null
    const art = document.querySelector<HTMLElement>('.invite-sheet .detail-art')
    if (!from || !art || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const to = art.getBoundingClientRect()
    if (!to.width) return
    const scale = from.width / to.width
    art.animate(
      [
        {
          transformOrigin: '0 0',
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale})`,
          borderRadius: '24px',
        },
        { transformOrigin: '0 0', transform: 'none', borderRadius: '14px' },
      ],
      { duration: 300, easing: 'cubic-bezier(0.2, 0.85, 0.2, 1)', fill: 'backwards' },
    )
  }, [])
  if (!visible || pathname !== expected) return null
  return (
    <Dialog
      title="Event invitation"
      className="event-sheet-dialog"
      closeDuration={140}
      close={() => {
        const root = document.documentElement
        const closeToken = String(Date.now())
        root.dataset.sheetClosing = closeToken
        setVisible(false)
        router.back()
        window.setTimeout(() => {
          if (root.dataset.sheetClosing === closeToken) delete root.dataset.sheetClosing
        }, 4000)
      }}
    >
      <div className="invite-sheet">{children}</div>
    </Dialog>
  )
}
