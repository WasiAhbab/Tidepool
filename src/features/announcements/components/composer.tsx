'use client'
import { useState, useRef } from 'react'
import { EventChoice } from '@/features/committee/components/event-choice'
import { useResource } from '@/hooks/use-resource'
import { api, reason } from '@/services/api-client'
import { SocietyEvent } from '@/lib/events'
type Post = { subject: string; body: string; audience: string; created_at: string }
function Composer({ e }: { e: SocietyEvent }) {
  const path = 'committee/events/' + e.id + '/announcements',
    { data, reload, error } = useResource<Post[]>(path),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    key = useRef('')
  return (
    <>
      <form
        className="form"
        onChange={() => {
          key.current = ''
        }}
        onSubmit={async (ev) => {
          ev.preventDefault()
          const f = ev.currentTarget,
            v = Object.fromEntries(new FormData(f))
          key.current ||= crypto.randomUUID()
          setBusy(true)
          try {
            const out = await api<{ count?: number }>(path, 'POST', {
              ...v,
              request_key: key.current,
            })
            setMessage(
              out.count === undefined
                ? 'This announcement was already queued.'
                : 'Queued for ' + out.count + ' guests.',
            )
            f.reset()
            key.current = ''
            await reload()
          } catch (err) {
            setMessage(reason(err))
          } finally {
            setBusy(false)
          }
        }}
      >
        <label>
          Send to
          <select name="audience">
            <option value="confirmed">Confirmed guests</option>
            <option value="waitlisted">Waiting list</option>
            <option value="all">All registered guests</option>
          </select>
        </label>
        <label>
          Subject
          <input required minLength={2} maxLength={140} name="subject" />
        </label>
        <label>
          Message
          <textarea rows={5} required minLength={3} maxLength={4000} name="body" />
        </label>
        <button className="solid" disabled={busy || e.state === 'draft'}>
          Queue announcement
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      <h2 className="subhead">Sent announcements</h2>
      {error && <p role="alert">{error}</p>}
      {data?.length ? (
        data.map((a) => (
          <article className="notice" key={a.created_at}>
            <small>
              {new Date(a.created_at).toLocaleString()} · {a.audience}
            </small>
            <h3>{a.subject}</h3>
            <p>{a.body}</p>
          </article>
        ))
      ) : (
        <p>No announcements for this event yet.</p>
      )}
    </>
  )
}
export function Announcements() {
  return <EventChoice>{(e) => <Composer e={e} />}</EventChoice>
}
