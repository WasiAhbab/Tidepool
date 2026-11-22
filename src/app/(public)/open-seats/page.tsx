import { LiveRefresh } from '@/features/spotlight/components/live-refresh'
import Link from 'next/link'
import Image from 'next/image'
import { Ticket } from 'lucide-react'
import { PageArt } from '@/features/spotlight/components/art'
import { loadEvents, left, live } from '@/features/spotlight/data'
import { cover, day, eventPath, time } from '@/lib/events'

export const metadata = { title: 'Open seats' }

export default async function OpenSeats() {
  const all = (await loadEvents()).filter(live),
    open = all
      .filter((e) => left(e) > 0)
      .sort((a, b) => left(a) / a.capacity - left(b) / b.capacity),
    full = all.filter((e) => left(e) === 0)
  return (
    <div className="sp-page">
      <LiveRefresh />
      <section className="sp-hero sp-tide">
        <div className="sp-art">
          <PageArt kind="open-seats" />
        </div>
        <div className="sp-hero-copy container">
          <p className="eyebrow">Open seats</p>
          <h1>Still room for you.</h1>
          <p className="sp-lede">
            Every event here has seats left right now, with the ones filling fastest at the top.
          </p>
        </div>
      </section>
      <div className="container sp-body">
        {open.length === 0 && (
          <section className="sp-empty">
            <h2>Every room is full</h2>
            <p>
              Join a waitlist below. When someone cancels, the next person in line gets the seat.
            </p>
          </section>
        )}
        <ol className="sp-board">
          {open.map((e, index) => {
            const n = left(e),
              pct = Math.round((e.attending / e.capacity) * 100),
              hot = pct >= 85
            return (
              <li key={e.id} style={{ '--ticket-index': index } as React.CSSProperties}>
                <Link
                  href={eventPath(e)}
                  scroll={false}
                  className={'sp-ticket' + (hot ? ' hot' : '')}
                >
                  <div className="sp-count">
                    <b>{n}</b>
                    <span>{n === 1 ? 'seat' : 'seats'} left</span>
                  </div>
                  <div className="sp-info">
                    <div className="sp-ticket-heading">
                      <small>{e.category}</small>
                      <span className={hot ? 'sp-ticket-status urgent' : 'sp-ticket-status'}>
                        <i /> {hot ? 'Filling quickly' : 'Room to join'}
                      </span>
                    </div>
                    <h3>{e.title}</h3>
                    <p className="sp-ticket-description">{e.description}</p>
                    <p>
                      {day(e.starts_at, e.timezone)} · {time(e.starts_at, e.timezone)} · {e.venue}
                    </p>
                    <div
                      className="sp-bar"
                      role="img"
                      aria-label={`${pct}% full; ${n} ${n === 1 ? 'seat' : 'seats'} available`}
                    >
                      <i style={{ width: pct + '%' }} />
                    </div>
                  </div>
                  <span className="sp-ticket-art" aria-hidden="true">
                    <Image src={cover(e)} alt="" fill sizes="220px" unoptimized />
                    <span className="sp-ticket-art-glint" />
                  </span>
                  <span className="sp-go">
                    <span>{hot ? 'Find a seat' : 'Reserve'}</span>
                    <i>
                      <Ticket size={16} />
                    </i>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
        {full.length > 0 && (
          <section>
            <h2 className="sp-h">Full, with a waitlist</h2>
            <div className="sp-rows">
              {full.map((e) => (
                <Link key={e.id} href={eventPath(e)} scroll={false} className="sp-row plain">
                  <div>
                    <b>{e.title}</b>
                    <span>
                      {day(e.starts_at, e.timezone)} · {e.waiting} waiting
                    </span>
                  </div>
                  <em>{e.waitlist_enabled ? 'Join waitlist' : 'Full'}</em>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
