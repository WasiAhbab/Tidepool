import { LiveRefresh } from '@/features/spotlight/components/live-refresh'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import { PageArt } from '@/features/spotlight/components/art'
import { loadEvents, left, live } from '@/features/spotlight/data'
import { cover, day, eventPath, time } from '@/lib/events'

export const metadata = { title: 'Hackathons' }

export default async function Hackathons() {
  const [upcoming, archive] = await Promise.all([loadEvents(), loadEvents('archive')]),
    next = upcoming
      .filter((e) => e.category === 'Hackathon' && live(e))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    past = archive.filter((e) => e.category === 'Hackathon').slice(0, 4),
    [first, ...more] = next
  return (
    <div className="sp-page">
      <LiveRefresh />
      <section className="sp-hero sp-night">
        <div className="sp-art">
          <PageArt kind="hackathons" />
        </div>
        <div className="sp-hero-copy container">
          <p className="eyebrow">Hackathons</p>
          <h1>Build something before sunrise.</h1>
          <p className="sp-lede">
            One night, one room, one idea that should not work and then does. Bring a laptop and a
            few people you want to build with.
          </p>
          {!first && <p className="sp-note">The next hackathon has not been announced yet.</p>}
        </div>
      </section>

      {first && (
        <section
          className="hackathon-spotlight container"
          aria-labelledby="hackathon-spotlight-title"
        >
          <Image
            className="hackathon-spotlight-image"
            src="/art/hackathon-live.webp"
            alt="Student teams share ideas and build together at a late-night hackathon"
            fill
            sizes="(max-width: 700px) 100vw, 92vw"
            priority
          />
          <div className="hackathon-spotlight-shade" />
          <div className="hackathon-spotlight-copy">
            <span className="hackathon-spotlight-label">This week’s competition</span>
            <p>One night to make something matter.</p>
            <h2 id="hackathon-spotlight-title">{first.title}</h2>
            <div className="hackathon-spotlight-meta">
              <span>
                <CalendarDays size={16} /> {day(first.starts_at, first.timezone)} ·{' '}
                {time(first.starts_at, first.timezone)}
              </span>
              <span>
                <MapPin size={16} /> {first.venue}
              </span>
            </div>
            <div className="hackathon-spotlight-actions">
              <Link className="hackathon-spotlight-cta" href={eventPath(first)} scroll={false}>
                Get in the room <ArrowRight size={18} />
              </Link>
              <span>
                <b>{left(first)}</b> seats left
              </span>
            </div>
          </div>
          <span className="hackathon-spotlight-date" aria-hidden="true">
            <small>
              {new Intl.DateTimeFormat('en', { month: 'short', timeZone: first.timezone }).format(
                new Date(first.starts_at),
              )}
            </small>
            <b>
              {new Intl.DateTimeFormat('en', { day: '2-digit', timeZone: first.timezone }).format(
                new Date(first.starts_at),
              )}
            </b>
          </span>
        </section>
      )}

      <div className="container sp-body">
        {more.length > 0 && (
          <section>
            <h2 className="sp-h">Also coming up</h2>
            <div className="sp-rows">
              {more.map((e) => (
                <Link key={e.id} href={eventPath(e)} scroll={false} className="sp-row">
                  <Image src={cover(e)} alt="" width={120} height={80} unoptimized />
                  <div>
                    <b>{e.title}</b>
                    <span>
                      <CalendarDays size={14} /> {day(e.starts_at, e.timezone)} ·{' '}
                      {time(e.starts_at, e.timezone)}
                    </span>
                    <span>
                      <MapPin size={14} /> {e.venue}
                    </span>
                  </div>
                  <em>{left(e)} left</em>
                </Link>
              ))}
            </div>
          </section>
        )}
        {!first && (
          <section className="sp-empty">
            <h2>Nothing scheduled right now</h2>
            <p>
              Hackathons are announced a few weeks ahead. In the meantime there is plenty on the
              calendar.
            </p>
            <Link className="solid" href="/#events">
              Browse all events
            </Link>
          </section>
        )}
        {past.length > 0 && (
          <section>
            <h2 className="sp-h">Previously on Tidepool</h2>
            <div className="sp-strip">
              {past.map((e) => (
                <Link key={e.id} href={eventPath(e)} scroll={false} className="sp-mini">
                  <Image src={cover(e)} alt="" width={320} height={210} unoptimized />
                  <b>{e.title}</b>
                  <span>
                    {e.attending} builders · {day(e.starts_at, e.timezone)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
