'use client'
import { ThemeToggle } from './theme-toggle'
import { CommandPalette } from './command-palette'
import type { Theme } from '@/store/theme-store'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { flip } from '@/lib/flip'
import {
  Waves,
  Compass,
  Ticket,
  LockKeyhole,
  Search,
  Info,
  Trophy,
  CalendarCheck,
  History,
} from 'lucide-react'

type Page = {
  label: string
  href: string
  icon: typeof Compass
  match: (p: string) => boolean
  tab?: boolean
}
export const pages: Page[] = [
  {
    label: 'Discover',
    href: '/',
    icon: Compass,
    tab: true,
    match: (p) => p === '/' || p.startsWith('/events'),
  },
  { label: 'Hackathons', href: '/hackathons', icon: Trophy, match: (p) => p === '/hackathons' },
  {
    label: 'Open seats',
    href: '/open-seats',
    icon: CalendarCheck,
    match: (p) => p === '/open-seats',
  },
  { label: 'Past events', href: '/past-events', icon: History, match: (p) => p === '/past-events' },
  {
    label: 'My passes',
    href: '/passes',
    icon: Ticket,
    tab: true,
    match: (p) => p.startsWith('/passes'),
  },
  {
    label: 'The society',
    href: '/society',
    icon: Info,
    tab: true,
    match: (p) => p === '/society' || p === '/about',
  },
]

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Tidepool home">
      <span className="brand-mark">
        <Waves size={26} strokeWidth={2.3} />
      </span>
      Tidepool
    </Link>
  )
}

function useHeaderState() {
  const [hidden, setHidden] = useState(false),
    [raised, setRaised] = useState(false),
    last = useRef(0)
  useEffect(() => {
    let frame = 0
    const run = () => {
      frame = 0
      const y = window.scrollY,
        delta = y - last.current
      setRaised(y > 8)
      if (y < 120) setHidden(false)
      else if (delta > 6) setHidden(true)
      else if (delta < -6) setHidden(false)
      last.current = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(run)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
  return { hidden, raised }
}

export function Navigation({ initial }: { initial: Theme }) {
  const path = usePathname() || '/',
    [open, setOpen] = useState(false),
    { hidden, raised } = useHeaderState()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === '/' && !typing && !(e.target as HTMLElement).isContentEditable) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    const mark = (e: PointerEvent) => {
      flip.from =
        (e.target as HTMLElement)
          .closest('.event-card')
          ?.querySelector('.card-art')
          ?.getBoundingClientRect() ?? null
      const stage = document.querySelector('main > div')
      if (!stage || !(e.target as HTMLElement).closest('a')) return
      const box = stage.getBoundingClientRect(),
        root = document.documentElement.style
      root.setProperty('--tx', Math.round(e.clientX - box.left) + 'px')
      root.setProperty('--ty', Math.round(e.clientY - box.top) + 'px')
    }
    document.addEventListener('pointerdown', mark, { capture: true, passive: true })
    return () => document.removeEventListener('pointerdown', mark, true)
  }, [])
  return (
    <>
      <div className="scroll-progress" aria-hidden="true" />
      <header className={'mast' + (hidden ? ' tucked' : '') + (raised ? ' raised' : '')}>
        <div className="nav-wrap">
          <Brand />
          <nav aria-label="Main navigation">
            {pages.map(({ label, href, icon: Icon, match }) => {
              const on = match(path)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? 'page' : undefined}
                  className={on ? 'active' : ''}
                >
                  {on && (
                    <motion.span
                      layoutId="desktop-nav-pill"
                      className="nav-pill"
                      aria-hidden="true"
                    />
                  )}
                  <Icon />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="nav-end">
            <button
              type="button"
              className="search-trigger"
              aria-label="Search events and pages"
              aria-keyshortcuts="Control+K Meta+K /"
              onClick={() => setOpen(true)}
            >
              <Search size={15} />
              <span>Search</span>
              <kbd>Ctrl K</kbd>
            </button>
            <ThemeToggle initial={initial} />
            <Link aria-label="Committee workspace" className="staff-link" href="/dashboard">
              <LockKeyhole size={15} />
              <span>Committee</span>
            </Link>
          </div>
        </div>
      </header>
      <nav className="tabbar" aria-label="Quick navigation">
        {pages
          .filter((p) => p.tab)
          .map(({ label, href, icon: Icon, match }) => {
            const on = match(path)
            return (
              <Link key={href} href={href} aria-current={on ? 'page' : undefined}>
                {on && (
                  <motion.span layoutId="mobile-tab-dot" className="tab-dot" aria-hidden="true" />
                )}
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            )
          })}
        <button type="button" onClick={() => setOpen(true)} aria-label="Search events and pages">
          <Search size={20} />
          <span>Search</span>
        </button>
      </nav>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function Footer() {
  return (
    <footer>
      <div>
        <Brand />
        <span>Computer Science Society</span>
      </div>
      <div className="footer-links">
        <Link href="/calendar">Subscribe to calendar</Link>
        <Link href="/society">About the society</Link>
      </div>
    </footer>
  )
}
