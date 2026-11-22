'use client'
import { useResource } from '@/hooks/use-resource'
import { CountUp } from '@/components/shared/movement'
import { motion } from 'motion/react'
type Report = {
  events: {
    id: string
    title: string
    capacity: number
    confirmed: number
    waiting: number
    arrived: number
    no_show: number | null
  }[]
  daily: { day: string; count: number }[]
  curve: { hour: string; count: number }[]
  repeat: number
  feedback: { id: string; title: string; rating: number; responses: number }[]
}
export function Analytics() {
  const { data, error, reload } = useResource<Report>('committee/analytics')
  if (error)
    return (
      <p role="alert">
        {error} <button onClick={reload}>Retry</button>
      </p>
    )
  if (!data) return <p>Loading attendance…</p>
  return (
    <>
      <div className="metrics">
        {[
          ['Confirmed seats', data.events.reduce((s, e) => s + e.confirmed, 0)],
          ['Waiting', data.events.reduce((s, e) => s + e.waiting, 0)],
          ['Repeat attendees', data.repeat],
        ].map(([label, n]) => (
          <div key={label}>
            <small>{label}</small>
            <b>
              <CountUp value={Number(n)} />
            </b>
          </div>
        ))}
      </div>
      <h2 className="subhead">What students thought</h2>
      <p className="muted">
        Ratings are shared only after at least three checked-in guests respond.
      </p>
      {data.feedback.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Average rating</th>
                <th>Responses</th>
              </tr>
            </thead>
            <tbody>
              {data.feedback.map((row) => (
                <tr key={row.id}>
                  <th>{row.title}</th>
                  <td>{row.rating.toFixed(1)} / 5</td>
                  <td>{row.responses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-inline">Feedback summaries will appear after three guests respond.</p>
      )}
      <h2 className="subhead">Registrations over time</h2>
      <Series rows={data.daily.map((r) => [r.day, r.count])} label="Registrations" />
      <h2 className="subhead">Arrivals by hour</h2>
      <Series
        rows={data.curve.map((r) => [new Date(r.hour).toLocaleString(), r.count])}
        label="Check-ins"
      />
      <h2 className="subhead">Event attendance</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {['Event', 'Fill rate', 'Waitlist', 'Checked in', 'No-show rate'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.events.map((e) => (
              <tr key={e.id}>
                <th>{e.title}</th>
                <td>{Math.round((e.confirmed / e.capacity) * 100)}%</td>
                <td>{e.waiting}</td>
                <td>{e.arrived}</td>
                <td>{e.no_show === null ? '—' : e.no_show + '%'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
function Series({ rows, label }: { rows: [string, number][]; label: string }) {
  if (!rows.length)
    return <p className="empty-inline">No {label.toLowerCase()} in the last 90 days.</p>
  const max = Math.max(1, ...rows.map((r) => r[1]))
  const d = rows
    .map(
      (r, i) =>
        (i ? 'L' : 'M') +
        ((i / Math.max(1, rows.length - 1)) * 570 + 5) +
        ' ' +
        (110 - (r[1] / max) * 100),
    )
    .join(' ')
  return (
    <>
      <svg className="chart" viewBox="0 0 580 120" aria-label={label + ' trend'} role="img">
        <motion.path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
        />
        {rows.map((r, i) => (
          <circle
            key={r[0]}
            cx={(i / Math.max(1, rows.length - 1)) * 570 + 5}
            cy={110 - (r[1] / max) * 100}
            r="3"
            fill="currentColor"
          />
        ))}
      </svg>
      <details>
        <summary>View {label.toLowerCase()} table</summary>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>{label}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([x, y]) => (
              <tr key={x}>
                <td>{x}</td>
                <td>{y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}
