'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Grid2X2, List, Search, SlidersHorizontal, X } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'
import { EventCard } from './event-card'
import { motion } from 'motion/react'
import { SocietyEvent, Category, day, eventPath } from '@/lib/events'
const dateKey = (e: SocietyEvent) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: e.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(e.starts_at))
const labels: Record<Category, string> = {
  Hackathon: 'Hackathons',
  Talk: 'Talks',
  Workshop: 'Workshops',
  Social: 'Socials',
}
function useSaved() {
  const [saved, setSaved] = useState<string[]>([])
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('tidepool.saved') || '[]')
      if (Array.isArray(list)) setSaved(list)
    } catch {}
  }, [])
  function toggle(id: string) {
    setSaved((ids) => {
      const next = ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]
      try {
        localStorage.setItem('tidepool.saved', JSON.stringify(next))
      } catch {}
      return next
    })
  }
  return { saved, toggle }
}
export function Browse({
  events,
  archive,
  initial,
}: {
  events: SocietyEvent[]
  archive: SocietyEvent[]
  initial: Record<string, string>
}) {
  const { saved, toggle } = useSaved()
  const [cat, setCat] = useState(initial.category || 'All events'),
    [query, setQuery] = useState(initial.q || ''),
    [search, setSearch] = useState(!!initial.q),
    [list, setList] = useState(initial.view === 'list'),
    [filter, setFilter] = useState(false),
    [onlySaved, setOnlySaved] = useState(initial.saved === '1'),
    [open, setOpen] = useState(initial.seats === '1'),
    [sort, setSort] = useState(initial.sort || 'soon'),
    [from, setFrom] = useState(initial.from || ''),
    [until, setUntil] = useState(initial.until || ''),
    [past, setPast] = useState(initial.scope === 'archive')
  useEffect(() => {
    const u = new URL(window.location.href)
    if (!['/', '/events'].includes(u.pathname)) return
    for (const [key, value] of Object.entries({
      q: query,
      category: cat === 'All events' ? '' : cat,
      sort: sort === 'soon' ? '' : sort,
      view: list ? 'list' : '',
      seats: open ? '1' : '',
      saved: onlySaved ? '1' : '',
      from,
      until,
      scope: past ? 'archive' : '',
    })) {
      if (value) u.searchParams.set(key, value)
      else u.searchParams.delete(key)
    }
    window.history.replaceState(null, '', u.pathname + u.search + u.hash)
  }, [cat, query, sort, list, open, onlySaved, from, until, past])
  const now = Date.now(),
    week = events
      .filter((e) => Date.parse(e.starts_at) > now && Date.parse(e.starts_at) <= now + 7 * 86400000)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const collection = past ? archive : events

  const shown = collection
    .filter(
      (e) =>
        (!from || dateKey(e) >= from) &&
        (!until || dateKey(e) <= until) &&
        (cat === 'All events' || cat === e.category) &&
        (!onlySaved || saved.includes(e.id)) &&
        (!open || (e.attending < e.capacity && new Date(e.starts_at).getTime() > Date.now())) &&
        (e.title + ' ' + e.venue + ' ' + e.category)
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    )
    .sort((a, b) =>
      sort === 'name' ? a.title.localeCompare(b.title) : a.starts_at.localeCompare(b.starts_at),
    )
  const working = onlySaved || open || !!from || !!until || sort !== 'soon'
  return (
    <div className="container browse-directory">
      {week.length > 0 && !past && (
        <section className="week-line" aria-label="Events happening this week">
          <p className="week-line-intro">
            <span>This week</span> A few good things, close by.
          </p>
          <div className="week-line-events">
            {week.slice(0, 3).map((e) => (
              <Link key={e.id} href={eventPath(e)}>
                <span>{e.title}</span>
                <small>{day(e.starts_at, e.timezone)}</small>
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
      <section id="events" className="directory">
        <div className="section-head">
          <div>
            <p className="eyebrow rust">
              <span className="tiny-line" />
              The campus calendar
            </p>
            <h2>
              {past ? 'Past events' : 'What’s coming up'}
              <span className="count">{collection.length.toString().padStart(2, '0')}</span>
            </h2>
          </div>
          <div className="directory-controls">
            <button className="archive-switch" aria-pressed={past} onClick={() => setPast(!past)}>
              {past ? 'Upcoming' : 'Archive'}
            </button>
            <div className="view-switch" aria-label="Event layout">
              <button
                className={!list ? 'selected' : ''}
                aria-label="Grid view"
                aria-pressed={!list}
                onClick={() => setList(false)}
              >
                <Grid2X2 size={17} />
              </button>
              <button
                className={list ? 'selected' : ''}
                aria-label="List view"
                aria-pressed={list}
                onClick={() => setList(true)}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="toolbar">
          <div className="tabs">
            {['All events', ...(['Workshop', 'Talk', 'Hackathon', 'Social'] as Category[])].map(
              (x) => (
                <button
                  className={cat === x ? 'current' : ''}
                  key={x}
                  aria-pressed={cat === x}
                  onClick={() => setCat(x)}
                >
                  {cat === x && <motion.span layoutId="active-filter" className="active-chip" />}
                  <span>{x === 'All events' ? x : labels[x as Category]}</span>
                </button>
              ),
            )}
          </div>
          <div className="tools">
            <button
              aria-expanded={search}
              aria-label="Search events"
              className={'square ' + (search ? 'tinted' : '')}
              onClick={() => setSearch(!search)}
            >
              <Search size={17} />
            </button>
            <button
              aria-label="Filters"
              aria-expanded={filter}
              className={'outline filter ' + (working || filter ? 'tinted' : '')}
              onClick={() => setFilter(!filter)}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {working && <b className="filter-dot" />}
            </button>
          </div>
        </div>
        {search && (
          <label className="searchline">
            <Search size={18} />
            <input
              autoFocus
              aria-label="Search by event or venue"
              placeholder="Search events or venues"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              aria-label="Close search"
              onClick={() => {
                setQuery('')
                setSearch(false)
              }}
            >
              <X size={17} />
            </button>
          </label>
        )}
        {filter && (
          <div className="filter-panel">
            <label>
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              Through
              <input
                type="date"
                min={from}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={onlySaved}
                onChange={(e) => setOnlySaved(e.target.checked)}
              />
              Saved events
            </label>
            <label>
              <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
              Available seats
            </label>
            <label>
              Sort{' '}
              <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="soon">Soonest first</option>
                <option value="name">Event name</option>
              </select>
            </label>
          </div>
        )}
        {shown.length ? (
          <div className={'cards ' + (list ? 'list' : '')}>
            {shown.map((e) => (
              <EventCard
                key={e.id}
                e={e}
                saved={saved.includes(e.id)}
                toggle={() => toggle(e.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Search />
            <h3>No matching events</h3>
            <p>
              {events.length
                ? 'Try another category or clear your filters.'
                : 'Check back when the society publishes its next event.'}
            </p>
            {events.length > 0 && (
              <button
                className="outline"
                onClick={() => {
                  setCat('All events')
                  setOpen(false)
                  setOnlySaved(false)
                  setQuery('')
                  setSort('soon')
                  setFrom('')
                  setUntil('')
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
