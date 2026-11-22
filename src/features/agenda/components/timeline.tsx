'use client'
import { useState } from 'react'
import Image from 'next/image'
import { SocietyEvent, day, time } from '@/lib/events'
export function Timeline({ event: e }: { event: SocietyEvent }) {
  const groups = new Map<string, NonNullable<SocietyEvent['agenda']>>()
  const calendarDay = new Intl.DateTimeFormat('en-CA', { timeZone: e.timezone, dateStyle: 'short' })
  for (const session of e.agenda || []) {
    const key = calendarDay.format(new Date(session.starts_at)),
      sessions = groups.get(key)
    if (sessions) sessions.push(session)
    else groups.set(key, [session])
  }
  const days = [...groups.keys()],
    [selected, select] = useState(''),
    key = days.includes(selected) ? selected : days[0]
  return (
    <>
      {!!e.speakers?.length && (
        <section className="programme-section">
          <h2>Meet the speakers</h2>
          <div className="speaker-line">
            {e.speakers.map((s) => (
              <article key={s.id}>
                <Image width={58} height={58} src={'/art/avatar-' + s.avatar + '.webp'} alt="" />
                <div>
                  <h3>{s.name}</h3>
                  <p>{s.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {days.length > 0 && (
        <section className="programme-section">
          <h2>Programme</h2>
          {days.length > 1 && (
            <div className="tabs">
              {days.map((d) => (
                <button key={d} aria-pressed={d === key} onClick={() => select(d)}>
                  {day(groups.get(d)![0].starts_at, e.timezone)}
                </button>
              ))}
            </div>
          )}
          <ol className="timeline">
            {groups.get(key)?.map((s) => (
              <li key={s.id}>
                <time>{time(s.starts_at, e.timezone)}</time>
                <div>
                  <h3>{s.title}</h3>
                  <small>
                    {[s.room, s.track, e.speakers?.find((p) => p.id === s.speaker_id)?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {e.resources?.length > 0 && (
        <section className="programme-section">
          <h2>Resources</h2>
          {e.resources.map((r) => (
            <p key={r.url}>
              <a className="text-btn" href={r.url} rel="noopener noreferrer" target="_blank">
                {r.label}
              </a>
            </p>
          ))}
        </section>
      )}
    </>
  )
}
