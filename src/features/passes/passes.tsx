'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, LogOut } from 'lucide-react'
import { TicketActions, pruneOffline, offlineKey } from './ticket'
import { Privacy } from './privacy'
import Image from 'next/image'
import { Pass, day, time, cover, eventPath, calendar } from '@/lib/events'
import { api, myPasses, ApiError, reason } from '@/services/api-client'
import { GuestAuth } from './guest-auth'
import { Dialog } from '@/components/ui/dialog'
export function Passes() {
  const [data, setData] = useState<{ email: string; passes: Pass[] } | null>(null),
    [loaded, setLoaded] = useState(false),
    [cancel, setCancel] = useState<Pass | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function load() {
    setError('')
    try {
      const current = await myPasses()
      setData(current)
      pruneOffline((current?.passes || []).filter((p) => p.qr).map((p) => p.id))
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setData(null)
      else setError(reason(e))
    } finally {
      setLoaded(true)
    }
  }
  useEffect(() => {
    void load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 20000)
    const refresh = () => void load()
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  async function leave() {
    if (!cancel) return
    setBusy(true)
    setError('')
    try {
      await api('events/' + cancel.event.id + '/cancel-pass', 'POST', {})
      setCancel(null)
      await load()
    } catch (e) {
      setError(reason(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="container subpage">
      <div className="page-title">
        <div>
          <p className="eyebrow rust">Your event wallet</p>
          <h1>My passes</h1>
        </div>
        {data && (
          <button
            className="outline"
            onClick={async () => {
              try {
                await api('auth/logout', 'POST', { role: 'guest' })
                localStorage.removeItem(offlineKey)
                setData(null)
              } catch (e) {
                setError(reason(e))
              }
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        )}
      </div>
      {error && !cancel && (
        <p role="alert" className="alert">
          {error} <button onClick={load}>Retry</button>
        </p>
      )}
      {!loaded ? (
        <p>Loading your passes…</p>
      ) : !data ? (
        <div className="auth-card">
          <GuestAuth done={load} />
        </div>
      ) : (
        <>
          <p className="muted">{data.email}</p>
          {!data.passes.length ? (
            <div className="empty">
              <Image
                src="/art/empty.webp"
                width={160}
                height={107}
                alt="A sandpiper in a quiet tide pool"
              />
              <h2>Your first event is waiting.</h2>
              <p>Register for a campus event and your pass will appear here.</p>
              <Link className="solid" href="/#events">
                Explore events
              </Link>
            </div>
          ) : (
            <div className="pass-stack">
              {data.passes.map((p) => (
                <article className="pass" key={p.id}>
                  <Image width={165} height={165} src={cover(p.event)} alt="" />
                  <div>
                    <p className="eyebrow rust">
                      {p.event.state === 'cancelled'
                        ? 'Event cancelled'
                        : p.checked_in_at
                          ? 'Checked in'
                          : p.status}
                    </p>
                    <Link href={eventPath(p.event)}>
                      <h2>{p.event.title}</h2>
                    </Link>
                    <p>
                      {day(p.event.starts_at, p.event.timezone)} ·{' '}
                      {time(p.event.starts_at, p.event.timezone)} · {p.event.venue}
                    </p>
                    <small>
                      {p.name} · Pass {p.id.slice(0, 8).toUpperCase()}
                    </small>
                    <TicketActions p={p} />
                    <div className="row-actions">
                      <button className="text-btn" onClick={() => calendar(p.event)}>
                        <CalendarPlus size={15} />
                        Add to calendar
                      </button>
                      {!p.checked_in_at &&
                        p.event.state === 'published' &&
                        Date.parse(p.event.starts_at) > Date.now() && (
                          <button
                            className="text-btn"
                            onClick={() => {
                              setError('')
                              setCancel(p)
                            }}
                          >
                            Cancel registration
                          </button>
                        )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <Privacy done={() => setData(null)} />
        </>
      )}
      {cancel && (
        <Dialog
          title="Cancel registration"
          close={() => {
            if (!busy) setCancel(null)
          }}
        >
          <div className="form">
            <h2>Release your place?</h2>
            <p>
              Your registration for {cancel.event.title} will be cancelled. An available seat goes
              to the next student on the waitlist.
            </p>
            {error && (
              <p role="alert" className="alert">
                {error}
              </p>
            )}
            <button className="solid" disabled={busy} onClick={leave}>
              Cancel registration
            </button>
            <button className="outline" disabled={busy} onClick={() => setCancel(null)}>
              Keep my place
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
