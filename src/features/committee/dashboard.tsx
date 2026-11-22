'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from '@/components/ui/toasts'
import { motion } from 'motion/react'
import Image from 'next/image'
import { CountUp } from '@/components/shared/movement'
import { AdmissionSettings } from './components/admission-settings'
import { Plus, Users, PenLine } from 'lucide-react'
import { SocietyEvent, day, cover } from '@/lib/events'
import { api, reason } from '@/services/api-client'
import { Roster } from './roster'
import { Editor } from './editor'
import { Dialog } from '@/components/ui/dialog'
export function Dashboard() {
  const [events, setEvents] = useState<SocietyEvent[] | null>(null),
    [loading, setLoading] = useState(true),
    [settings, setSettings] = useState<SocietyEvent | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<SocietyEvent | null | undefined>(undefined),
    [roster, setRoster] = useState<SocietyEvent | null>(null),
    [cancel, setCancel] = useState<SocietyEvent | null>(null),
    [q, setQ] = useState('')
  async function load() {
    try {
      setEvents(await api('committee/events'))
      setError('')
    } catch (e) {
      setError(reason(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  async function cancelEvent() {
    if (!cancel) return
    setBusy(true)
    setError('')
    try {
      const { title, category, venue, description, capacity, starts_at, ends_at } = cancel
      await api('committee/events/' + cancel.id, 'PATCH', {
        title,
        category,
        venue,
        description,
        capacity,
        starts_at,
        ends_at,
        state: 'cancelled',
        revision: cancel.revision,
      })
      setCancel(null)
      toast('Event cancelled. Guest notices are queued.')
      await load()
    } catch (e) {
      setError(reason(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="subpage">
      <div className="page-title">
        <div>
          <p className="eyebrow rust">Computer Science Society</p>
          <h1>Events</h1>
        </div>
      </div>
      {loading ? (
        <p>Loading workspace…</p>
      ) : !events ? (
        <p role="alert">
          {error} <button onClick={load}>Retry</button>
        </p>
      ) : (
        <>
          <div className="metrics">
            {[
              ['Events', events.length],
              [
                'Confirmed seats',
                events.filter((e) => e.state === 'published').reduce((n, e) => n + e.attending, 0),
              ],
              [
                'On the waitlist',
                events.filter((e) => e.state === 'published').reduce((n, e) => n + e.waiting, 0),
              ],
            ].map(([label, n]) => (
              <div key={label}>
                <small>{label}</small>
                <b>
                  <CountUp value={Number(n)} />
                </b>
              </div>
            ))}
          </div>
          <div className="admin-bar">
            <input
              aria-label="Find an event"
              placeholder="Find an event"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="solid" onClick={() => setEdit(null)}>
              <Plus size={16} />
              Create event
            </button>
          </div>
          {error && !cancel && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          <div className="admin-list">
            {events
              .filter((e) => e.title.toLowerCase().includes(q.toLowerCase()))
              .map((e) => (
                <motion.article layout="position" key={e.id}>
                  <Image width={83} height={75} alt="" src={cover(e)} />
                  <div className="admin-event">
                    <small>
                      {day(e.starts_at)} · {e.state}
                    </small>
                    <h3>{e.title}</h3>
                    <p>
                      {e.attending} / {e.capacity} seats · {e.waiting} waiting
                    </p>
                  </div>
                  <div className="row-actions">
                    <Link className="text-btn" href={'/dashboard/programme?event=' + e.id}>
                      Programme
                    </Link>
                    {e.state === 'published' && Date.parse(e.ends_at) <= Date.now() && (
                      <button
                        className="text-btn"
                        onClick={async () => {
                          try {
                            await api('committee/events/' + e.id + '/archive', 'POST', {
                              revision: e.revision,
                            })
                            await load()
                          } catch (err) {
                            setError(reason(err))
                          }
                        }}
                      >
                        Archive
                      </button>
                    )}
                    <button
                      className="text-btn"
                      onClick={async () => {
                        try {
                          await api('committee/events/' + e.id + '/duplicate', 'POST', {})
                          toast('Draft copy created.')
                          await load()
                        } catch (err) {
                          setError(reason(err))
                        }
                      }}
                    >
                      Duplicate
                    </button>
                    <button className="outline" onClick={() => setRoster(e)}>
                      <Users size={15} />
                      Roster
                    </button>
                    {e.state !== 'cancelled' && Date.parse(e.ends_at) > Date.now() && (
                      <>
                        <button className="outline" onClick={() => setSettings(e)}>
                          Admission
                        </button>
                        <button className="outline" onClick={() => setEdit(e)}>
                          <PenLine size={15} />
                          Edit
                        </button>
                        <button
                          className="text-btn"
                          onClick={() => {
                            setError('')
                            setCancel(e)
                          }}
                        >
                          Cancel event
                        </button>
                      </>
                    )}
                  </div>
                </motion.article>
              ))}
          </div>
          {!events.some((e) => e.title.toLowerCase().includes(q.toLowerCase())) && (
            <p className="empty">No events to display.</p>
          )}
        </>
      )}
      {edit !== undefined && (
        <Editor
          event={edit}
          close={() => {
            setEdit(undefined)
            void load()
          }}
          done={() => {
            toast('Event saved.')
            setEdit(undefined)
            void load()
          }}
        />
      )}
      {settings && (
        <AdmissionSettings
          e={settings}
          close={() => setSettings(null)}
          done={() => {
            setSettings(null)
            void load()
          }}
        />
      )}
      {roster && <Roster event={roster} close={() => setRoster(null)} />}
      {cancel && (
        <Dialog title="Cancel this event" close={() => !busy && setCancel(null)}>
          <div className="form">
            <h2>Cancel this event?</h2>
            <p>
              Registration for {cancel.title} will close and registered guests will receive an
              email. The roster will remain available.
            </p>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
            <button className="solid" disabled={busy} onClick={cancelEvent}>
              Confirm cancellation
            </button>
            <button className="outline" disabled={busy} onClick={() => setCancel(null)}>
              Keep event
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
