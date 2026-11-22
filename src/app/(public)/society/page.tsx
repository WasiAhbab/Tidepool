import { LiveRefresh } from '@/features/spotlight/components/live-refresh'
import Link from 'next/link'
import { PageArt } from '@/features/spotlight/components/art'
import { loadEvents, live } from '@/features/spotlight/data'
import Image from 'next/image'
import { ArrowUpRight, Code2, Coffee, Lightbulb } from 'lucide-react'

export const metadata = { title: 'The society' }

export default async function Society() {
  const [upcoming, archive] = await Promise.all([loadEvents(), loadEvents('archive')]),
    stats = [
      [archive.length, 'events hosted'],
      [archive.reduce((n, e) => n + e.attending, 0), 'seats filled'],
      [upcoming.filter(live).length, 'coming up'],
    ] as const
  return (
    <div className="sp-page">
      <LiveRefresh />
      <section className="sp-hero sp-night short">
        <div className="sp-art">
          <PageArt kind="society" />
        </div>
        <div className="sp-hero-copy container">
          <p className="eyebrow">Computer Science Society</p>
          <h1>Meet on campus.</h1>
          <dl className="sp-stats">
            {stats.map(([n, label]) => (
              <div key={label}>
                <dt>{n.toLocaleString()}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <div className="container sp-body sp-prose-layout">
        <div className="sp-prose">
          <p className="sp-prose-intro">
            The best campus memories rarely start on a syllabus. They start with a question after a
            talk, a sketch that turns into a project, or one more hour spent building with people
            who get it.
          </p>
          <h2>Come for the idea. Leave with people.</h2>
          <p>
            Pick the room that sounds right. A verified campus email holds your seat, and your pass
            is waiting in My passes. If the room fills, join the live waitlist; a released seat goes
            to the next student in line.
          </p>
          <h2>At the door, there’s a place for you.</h2>
          <p>
            Look for a society volunteer at the entrance. We’ll find your name, check you in, and
            point you toward a seat. Your email stays private to you and the organizing team.
          </p>
          <Link className="sp-browse-cta" href="/#events">
            <span className="sp-browse-cta-copy">
              <small>MAKE ROOM FOR A GOOD THING</small>
              <strong>Browse events</strong>
              <span>Find your next gathering</span>
            </span>
            <span className="sp-browse-cta-mark" aria-hidden="true">
              <ArrowUpRight size={21} />
            </span>
          </Link>
          <div className="society-formats">
            <p>Find your kind of room</p>
            <div>
              <Link href="/events?category=Workshop">
                <span className="society-format-icon">
                  <Lightbulb size={17} />
                </span>
                <span>
                  <b>Try something new</b>
                  <small>Workshops</small>
                </span>
                <small>Explore</small>
              </Link>
              <Link href="/events?category=Hackathon">
                <span className="society-format-icon">
                  <Code2 size={17} />
                </span>
                <span>
                  <b>Make it real</b>
                  <small>Build nights</small>
                </span>
                <small>Explore</small>
              </Link>
              <Link href="/events?category=Social">
                <span className="society-format-icon">
                  <Coffee size={17} />
                </span>
                <span>
                  <b>Meet your people</b>
                  <small>Socials</small>
                </span>
                <small>Explore</small>
              </Link>
            </div>
          </div>
        </div>
        <figure className="sp-society-photo">
          <div className="sp-society-photo-image">
            <Image
              src="/art/pages/society-studio.webp"
              alt="Computer science society students sharing project ideas around a laptop in their campus studio"
              fill
              priority
              sizes="(max-width: 700px) 92vw, 40vw"
            />
          </div>
          <figcaption>Good ideas start around a shared table.</figcaption>
        </figure>
      </div>
    </div>
  )
}
