import { LiveRefresh } from '@/features/spotlight/components/live-refresh'
import Link from 'next/link'
import Image from 'next/image'
import { PageArt } from '@/features/spotlight/components/art'
import { loadEvents } from '@/features/spotlight/data'
import { cover, date, day, eventPath } from '@/lib/events'

export const metadata = { title: 'Past events' }

export default async function PastEvents() {
  const archive = (await loadEvents('archive')).sort((a, b) =>
      b.starts_at.localeCompare(a.starts_at),
    ),
    groups = new Map<string, typeof archive>()
  for (const e of archive) {
    const key = date(e.starts_at, { month: 'long', year: 'numeric' }, e.timezone)
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  const total = archive.reduce((n, e) => n + e.attending, 0)
  return (
    <div className="sp-page">
      <LiveRefresh />
      <section className="sp-hero sp-paper">
        <div className="sp-art">
          <PageArt kind="past-events" />
        </div>
        <div className="sp-hero-copy container">
          <p className="eyebrow rust">The archive</p>
          <h1>Nights worth remembering.</h1>
          {archive.length > 0 && (
            <p className="sp-lede">
              {archive.length} events and {total.toLocaleString()} seats filled so far. Open any one
              for the details and the resources shared afterwards.
            </p>
          )}
        </div>
      </section>
      <div className="container sp-body">
        {archive.length === 0 && (
          <section className="sp-empty">
            <h2>The archive is empty</h2>
            <p>Events appear here once they have finished.</p>
            <Link className="solid" href="/#events">
              See what is coming
            </Link>
          </section>
        )}
        {[...groups].map(([month, list]) => (
          <section key={month} className="sp-month">
            <h2 className="sp-h">{month}</h2>
            <div className="sp-contact">
              {list.map((e, i) => (
                <Link
                  key={e.id}
                  href={eventPath(e)}
                  scroll={false}
                  className="sp-frame"
                  style={{ ['--tilt' as string]: (i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.4) + 'deg' }}
                >
                  <Image src={cover(e)} alt="" width={420} height={300} unoptimized />
                  <b>{e.title}</b>
                  <span>
                    {day(e.starts_at, e.timezone)} · {e.attending} came
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
