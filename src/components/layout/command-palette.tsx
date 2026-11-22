'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import {
  CornerDownLeft,
  Search,
  CalendarDays,
  Compass,
  Ticket,
  Info,
  LockKeyhole,
} from 'lucide-react'
import { api } from '@/services/api-client'
import { date, type SocietyEvent } from '@/lib/events'

type Entry = { id: string; label: string; hint: string; href: string; kind: 'page' | 'event' }

const pageEntries: Entry[] = [
  { id: 'p-home', label: 'Discover events', hint: 'Home', href: '/', kind: 'page' },
  { id: 'p-all', label: 'All events', hint: 'Browse', href: '/events', kind: 'page' },
  { id: 'p-hack', label: 'Hackathons', hint: 'Filter', href: '/hackathons', kind: 'page' },
  {
    id: 'p-seats',
    label: 'Events with open seats',
    hint: 'Filter',
    href: '/open-seats',
    kind: 'page',
  },
  { id: 'p-past', label: 'Past events', hint: 'Archive', href: '/past-events', kind: 'page' },
  { id: 'p-passes', label: 'My passes', hint: 'Tickets', href: '/passes', kind: 'page' },
  { id: 'p-society', label: 'About the society', hint: 'Society', href: '/society', kind: 'page' },
  {
    id: 'p-committee',
    label: 'Committee workspace',
    hint: 'Sign in',
    href: '/dashboard',
    kind: 'page',
  },
]

const icons = {
  '/': Compass,
  '/events': CalendarDays,
  '/passes': Ticket,
  '/society': Info,
  '/dashboard': LockKeyhole,
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter(),
    input = useRef<HTMLInputElement>(null),
    opener = useRef<HTMLElement | null>(null),
    [query, setQuery] = useState(''),
    [events, setEvents] = useState<Entry[] | null>(null),
    [cursor, setCursor] = useState(0)

  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement as HTMLElement | null
    setQuery('')
    setCursor(0)
    requestAnimationFrame(() => input.current?.focus())
    document.documentElement.style.overflow = 'hidden'
    if (!events)
      api<SocietyEvent[]>('events')
        .then((list) =>
          setEvents(
            list.map((e) => ({
              id: e.id,
              label: e.title,
              hint:
                date(e.starts_at, { month: 'short', day: 'numeric' }, e.timezone) +
                ' · ' +
                e.category,
              href: '/events/' + e.slug,
              kind: 'event' as const,
            })),
          ),
        )
        .catch(() => setEvents([]))
    return () => {
      document.documentElement.style.overflow = ''
      opener.current?.focus?.()
    }
    // the event list is only fetched once, the first time the palette opens
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase(),
      all = [...pageEntries, ...(events ?? [])]
    if (!q) return [...pageEntries, ...(events ?? []).slice(0, 5)]
    return all.filter((e) => (e.label + ' ' + e.hint).toLowerCase().includes(q)).slice(0, 8)
  }, [query, events])

  const go = (entry: Entry | undefined) => {
    if (!entry) return
    onClose()
    router.push(entry.href)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="palette-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Search events and pages"
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setCursor((c) => Math.min(c + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                go(results[cursor])
              }
            }}
          >
            <label className="palette-field">
              <Search size={18} aria-hidden="true" />
              <input
                ref={input}
                value={query}
                placeholder="Search events, jump to a page"
                aria-label="Search"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={results[cursor] ? 'opt-' + results[cursor].id : undefined}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setCursor(0)
                }}
              />
              <kbd>Esc</kbd>
            </label>
            <ul id="palette-list" role="listbox" aria-label="Results">
              {results.map((r, i) => {
                const Icon =
                  r.kind === 'event'
                    ? CalendarDays
                    : (icons[r.href as keyof typeof icons] ?? Compass)
                return (
                  <li
                    key={r.id}
                    id={'opt-' + r.id}
                    role="option"
                    aria-selected={i === cursor}
                    className={i === cursor ? 'on' : ''}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(r)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{r.label}</span>
                    <small>{r.hint}</small>
                    {i === cursor && <CornerDownLeft size={14} aria-hidden="true" />}
                  </li>
                )
              })}
              {!results.length && <li className="none">Nothing matches &ldquo;{query}&rdquo;.</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
