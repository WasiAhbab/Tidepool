'use client'
import { useEffect, useState } from 'react'
import { QrCode, Download, Printer, Star } from 'lucide-react'
import { Pass, day, time } from '@/lib/events'
import { api, reason } from '@/services/api-client'
import { Dialog } from '@/components/ui/dialog'
export const offlineKey = 'tidepool.offline'
type OfflinePass = {
  id: string
  expires: string
  title: string
  name: string
  when: string
  venue: string
  status: string
  image: string
}
export function pruneOffline(ids: string[]) {
  try {
    const old: OfflinePass[] = JSON.parse(localStorage.getItem(offlineKey) || '[]')
    localStorage.setItem(
      offlineKey,
      JSON.stringify(old.filter((p) => ids.includes(p.id) && Date.parse(p.expires) > Date.now())),
    )
  } catch {
    localStorage.removeItem(offlineKey)
  }
}
export function TicketActions({ p }: { p: Pass }) {
  const [show, setShow] = useState<'qr' | 'feedback' | 'certificate' | null>(null),
    [qr, setQr] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  const e = p.event,
    done = Date.parse(e.ends_at) < Date.now(),
    stamp = (v: string) =>
      new Date(v)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '')
  const google =
      'https://calendar.google.com/calendar/render?' +
      new URLSearchParams({
        action: 'TEMPLATE',
        text: e.title,
        location: e.venue,
        details: e.description,
        dates: stamp(e.starts_at) + '/' + stamp(e.ends_at),
        ctz: e.timezone,
      }),
    outlook =
      'https://outlook.live.com/calendar/0/deeplink/compose?' +
      new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: e.title,
        startdt: e.starts_at,
        enddt: e.ends_at,
        location: e.venue,
        body: e.description,
      })
  useEffect(() => {
    if (!p.qr || show !== 'qr') return
    let live = true
    import('qrcode')
      .then((m) =>
        m.toDataURL(p.qr!, { width: 320, margin: 4, color: { dark: '#102633', light: '#ffffff' } }),
      )
      .then((s) => {
        if (live) setQr(s)
      })
      .catch(() => {
        if (live) setMessage('QR unavailable. The door team can look up your name.')
      })
    return () => {
      live = false
    }
  }, [p.qr, show])
  async function feedback(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const d = new FormData(ev.currentTarget)
    setBusy(true)
    try {
      await api('passes/' + p.id + '/feedback', 'POST', {
        rating: Number(d.get('rating')),
        comment: d.get('comment'),
      })
      setShow(null)
      setMessage('Your feedback has been saved.')
    } catch (err) {
      setMessage(reason(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="row-actions">
        {p.qr && (
          <button
            className="text-btn"
            onClick={() => {
              setMessage('')
              setShow('qr')
            }}
          >
            <QrCode size={15} />
            Show entry QR
          </button>
        )}
        {!!p.position && <span className="wait-position">Waitlist place {p.position}</span>}
        <a className="text-btn" href={google} target="_blank" rel="noreferrer">
          Google Calendar
        </a>
        <a className="text-btn" href={outlook} target="_blank" rel="noreferrer">
          Outlook
        </a>
        {p.checked_in_at && done && (
          <>
            <button className="text-btn" onClick={() => setShow('feedback')}>
              <Star size={15} />
              Event feedback
            </button>
            <button className="text-btn" onClick={() => setShow('certificate')}>
              Attendance certificate
            </button>
          </>
        )}
      </div>
      {message && !show && <p role="status">{message}</p>}
      {show && (
        <Dialog
          title={
            show === 'qr'
              ? 'Entry pass'
              : show === 'feedback'
                ? 'Event feedback'
                : 'Attendance certificate'
          }
          close={() => setShow(null)}
        >
          {show === 'qr' ? (
            <section className="form ticket-flip">
              <p className="eyebrow rust">
                Entry pass · {p.party_size} {p.party_size === 1 ? 'seat' : 'seats'}
              </p>
              <h2>{e.title}</h2>
              <p>
                {p.name} · {e.venue}
              </p>
              {qr && (
                <img className="qr" src={qr} alt="Signed entry QR code" width={230} height={230} />
              )}
              <small>Pass {p.id.slice(0, 8).toUpperCase()}</small>
              <button
                className="outline"
                disabled={!qr}
                onClick={() => {
                  try {
                    const old: OfflinePass[] = JSON.parse(localStorage.getItem(offlineKey) || '[]')
                    const data: OfflinePass = {
                      id: p.id,
                      title: e.title,
                      name: p.name,
                      when: day(e.starts_at, e.timezone) + ' ' + time(e.starts_at, e.timezone),
                      venue: e.venue,
                      expires: e.ends_at,
                      status: p.status,
                      image: qr,
                    }
                    localStorage.setItem(
                      offlineKey,
                      JSON.stringify([...old.filter((v) => v.id !== p.id), data]),
                    )
                    setMessage('Saved on this device for offline entry.')
                  } catch {
                    setMessage('This browser could not save the pass.')
                  }
                }}
              >
                <Download size={16} />
                Save on this device
              </button>
              <button className="text-btn" onClick={() => window.print()}>
                <Printer size={16} />
                Print pass
              </button>
            </section>
          ) : show === 'certificate' ? (
            <section className="form certificate">
              <p className="eyebrow">Computer Science Society</p>
              <h2>Certificate of attendance</h2>
              <p>
                Presented to <b>{p.name}</b> for attending <b>{e.title}</b> on{' '}
                {day(e.starts_at, e.timezone)}.
              </p>
              <small>Attendance record {p.id}</small>
              <button className="outline" onClick={() => window.print()}>
                Print certificate
              </button>
            </section>
          ) : (
            <form className="form" onSubmit={feedback}>
              <h2>How was {e.title}?</h2>
              <label>
                Rating
                <select name="rating" defaultValue={p.rating ? String(p.rating) : ''} required>
                  {!p.rating && (
                    <option value="" disabled>
                      Choose a rating
                    </option>
                  )}
                  {[5, 4, 3, 2, 1].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Comments
                <textarea name="comment" maxLength={2000} />
              </label>
              <button className="solid" disabled={busy}>
                Save feedback
              </button>
            </form>
          )}
          {message && <p role="status">{message}</p>}
        </Dialog>
      )}
    </>
  )
}
