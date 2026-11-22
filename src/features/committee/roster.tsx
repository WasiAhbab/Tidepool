'use client'
import { useState, useRef, useEffect } from 'react'
import { Download, Search, Printer } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { api, reason } from '@/services/api-client'
import { useResource } from '@/hooks/use-resource'
import { SocietyEvent } from '@/lib/events'
import { Dialog } from '@/components/ui/dialog'
type Guest = {
  id: string
  name: string
  email: string
  status: string
  checked_in_at: string | null
  party_size: number
  university: string | null
  academic_level: 'Bachelor' | 'Master' | 'Other' | null
  subject: string | null
  study_period: string | null
  phone: string | null
  answers: Record<string, string> | null
}
export function Roster({ event, close }: { event: SocietyEvent; close: () => void }) {
  const base = 'committee/events/' + event.id,
    { data, error, reload } = useResource<Guest[]>(base + '/roster'),
    rows = data || [],
    [q, search] = useState(''),
    [filter, setFilter] = useState('all'),
    [selected, select] = useState<string[]>([]),
    [action, choose] = useState(''),
    [text, setText] = useState(''),
    [msg, setMsg] = useState(''),
    [busy, setBusy] = useState(false),
    [print, setPrint] = useState(false)
  const shown = rows.filter(
      (r) =>
        (
          r.name +
          ' ' +
          r.email +
          ' ' +
          (r.university || '') +
          ' ' +
          (r.subject || '') +
          ' ' +
          (r.phone || '')
        )
          .toLowerCase()
          .includes(q.toLowerCase()) &&
        (filter === 'all' || filter === r.status || (filter === 'arrived' && r.checked_in_at)),
    ),
    ref = useRef<HTMLDivElement>(null)
  const virtual = useVirtualizer({
    count: shown.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 93,
    overscan: 8,
  })
  useEffect(() => {
    const before = () => setPrint(true),
      after = () => setPrint(false)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])
  async function check(r: Guest) {
    setBusy(true)
    try {
      await api(base + '/check-in', 'POST', { registration: r.id, checked: !r.checked_in_at })
      await reload()
    } catch (e) {
      setMsg(reason(e))
    } finally {
      setBusy(false)
    }
  }
  async function apply() {
    setBusy(true)
    try {
      await api(base + '/bulk', 'POST', {
        ids: selected,
        action,
        message: text,
        request_key: crypto.randomUUID(),
      })
      setMsg('Updated ' + selected.length + ' registrations.')
      choose('')
      select([])
      await reload()
    } catch (e) {
      setMsg(reason(e))
    } finally {
      setBusy(false)
    }
  }
  function row(g: Guest) {
    return (
      <div className="guest">
        <input
          type="checkbox"
          aria-label={'Select ' + g.name}
          checked={selected.includes(g.id)}
          onChange={(e) =>
            select(e.target.checked ? [...selected, g.id] : selected.filter((id) => id !== g.id))
          }
        />
        <div>
          <b>{g.name}</b>
          <small>
            {g.email} · {g.status}
          </small>
          {(g.university || g.subject || g.study_period || g.phone) && (
            <small>
              {[g.university, g.academic_level, g.subject, g.study_period, g.phone]
                .filter(Boolean)
                .join(' · ')}
            </small>
          )}
          {g.answers && (
            <small>
              {Object.entries(g.answers)
                .map(([k, v]) => k + ' · ' + v)
                .join(' / ')}
            </small>
          )}
        </div>
        {g.status === 'confirmed' && event.state === 'published' && (
          <button className="outline" disabled={busy} onClick={() => check(g)}>
            {g.checked_in_at ? 'Undo check-in' : 'Check in'}
          </button>
        )}
      </div>
    )
  }
  return (
    <Dialog title="Attendee roster" close={close}>
      <section className="roster">
        <p className="eyebrow rust">Attendee roster</p>
        <h2>{event.title}</h2>
        <p>
          {rows.length} registered · {rows.filter((r) => r.checked_in_at).length} checked in
        </p>
        <div className="roster-tools">
          <label className="searchline">
            <Search size={16} />
            <input
              aria-label="Search attendees"
              value={q}
              onChange={(e) => search(e.target.value)}
              placeholder="Name, email, university, or phone"
            />
          </label>
          <select
            aria-label="Roster filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {['all', 'confirmed', 'waitlisted', 'arrived'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="row-actions">
          <a className="outline" href={'/api/v1/' + base + '/export'} download>
            <Download size={15} />
            CSV
          </a>
          <a className="outline" href={'/api/v1/' + base + '/export?format=xlsx'} download>
            XLSX
          </a>
          <button
            className="outline"
            onClick={() => {
              setPrint(true)
              setTimeout(() => window.print(), 80)
            }}
          >
            <Printer size={15} />
            Print
          </button>
          {shown.length > 0 && (
            <button
              className="text-btn"
              onClick={() => select(selected.length ? [] : shown.slice(0, 300).map((r) => r.id))}
            >
              {selected.length ? 'Clear selection' : 'Select visible group'}
            </button>
          )}
        </div>
        {!!selected.length && (
          <div className="filter-panel">
            <span>{selected.length} selected</span>
            <select
              aria-label="Bulk action"
              value={action}
              onChange={(e) => choose(e.target.value)}
            >
              <option value="">Choose action</option>
              {['cancel', 'promote', 'resend', 'message'].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            {action === 'message' && (
              <textarea
                aria-label="Message selected guests"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}
            <button className="outline" disabled={!action || busy} onClick={apply}>
              Confirm {action}
            </button>
          </div>
        )}
        {(msg || error) && <p role="status">{msg || error}</p>}
        {!data ? (
          <p>Loading guests…</p>
        ) : !shown.length ? (
          <p className="empty">No attendees match this view.</p>
        ) : print ? (
          <div className="print-roster">
            {shown.map((r) => (
              <div key={r.id}>{row(r)}</div>
            ))}
          </div>
        ) : (
          <div className="virtual-list" ref={ref}>
            <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
              {virtual.getVirtualItems().map((v) => (
                <div
                  key={v.key}
                  ref={virtual.measureElement}
                  data-index={v.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: 'translateY(' + v.start + 'px)',
                  }}
                >
                  {row(shown[v.index])}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </Dialog>
  )
}
