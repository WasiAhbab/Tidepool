'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, MapPin } from 'lucide-react'
import { api, reason } from '@/services/api-client'
import { day, time } from '@/lib/events'

type EventPreview = {
  title: string
  starts_at: string
  venue: string
  timezone: string
  status: string
}

export function CancelRegistration() {
  const [token, setToken] = useState(''),
    [event, setEvent] = useState<EventPreview | null>(null),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState('')

  useEffect(() => {
    const value = location.hash.slice(1)
    history.replaceState(null, '', location.pathname + location.search)
    if (!value) {
      setError('This cancellation link is missing or has already been used.')
      return
    }
    setToken(value)
    api<EventPreview>('passes/cancel-link/preview', 'POST', { token: value })
      .then(setEvent)
      .catch((cause) => setError(reason(cause)))
  }, [])

  async function release() {
    if (!token || busy) return
    setBusy(true)
    setError('')
    try {
      await api('passes/cancel-link', 'POST', { token })
      setDone(true)
    } catch (cause) {
      setError(reason(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container cancel-page">
      <p className="eyebrow rust">Tidepool · Your place</p>
      {done ? (
        <>
          <h1>Your seat is back in the pool.</h1>
          <p className="calendar-lede">
            Your registration was cancelled. If someone was waiting, they’ll receive an email as
            soon as their place is confirmed.
          </p>
          <Link className="solid" href="/">
            Browse upcoming events
          </Link>
        </>
      ) : error && !event ? (
        <>
          <h1>This link can’t release a place.</h1>
          <p className="calendar-lede">{error}</p>
          <Link className="outline" href="/passes">
            Open My passes
          </Link>
        </>
      ) : !event ? (
        <>
          <h1>Checking your place…</h1>
          <p className="calendar-lede" role="status">
            Making sure this link is current.
          </p>
        </>
      ) : (
        <>
          <h1>Can’t make it?</h1>
          <p className="calendar-lede">
            Releasing your place lets someone on the waitlist join. We’ll send you a confirmation
            once it’s done.
          </p>
          <section className="cancel-event-card" aria-label="Event details">
            <b>{event.title}</b>
            <span>
              <CalendarDays size={16} /> {day(event.starts_at, event.timezone)} ·{' '}
              {time(event.starts_at, event.timezone)}
            </span>
            <span>
              <MapPin size={16} /> {event.venue}
            </span>
            <small>Your registration: {event.status}</small>
          </section>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <div className="cancel-actions">
            <button className="solid" disabled={busy} onClick={release}>
              {busy ? 'Releasing your place…' : 'Release my place'}
            </button>
            <Link className="text-btn" href="/">
              Keep my place and return
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
