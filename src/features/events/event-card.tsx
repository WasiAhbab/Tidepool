'use client'
import { ViewTransition } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import Image from 'next/image'
import { Bookmark, CalendarDays, MapPin } from 'lucide-react'
import { SocietyEvent, cover, eventPath, date, day, time } from '@/lib/events'
import { Meter } from '@/components/ui/meter'
import { motionTokens } from '@/lib/motion'
export function EventCard({
  e,
  saved,
  toggle,
}: {
  e: SocietyEvent
  saved: boolean
  toggle: () => void
}) {
  const reduced = useReducedMotion(),
    rawX = useMotionValue(0),
    rawY = useMotionValue(0),
    rotateX = useSpring(rawX, motionTokens.spring),
    rotateY = useSpring(rawY, motionTokens.spring)
  return (
    <motion.article
      layout="position"
      className="event-card"
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(ev) => {
        if (reduced || ev.pointerType !== 'mouse') return
        const b = ev.currentTarget.getBoundingClientRect()
        rawX.set((0.5 - (ev.clientY - b.top) / b.height) * motionTokens.tilt)
        rawY.set(((ev.clientX - b.left) / b.width - 0.5) * motionTokens.tilt)
      }}
      onPointerLeave={() => {
        rawX.set(0)
        rawY.set(0)
      }}
      initial={false}
      whileTap={motionTokens.press}
    >
      <Link
        className="card-main"
        href={eventPath(e)}
        scroll={false}
        transitionTypes={['nav-forward']}
      >
        <div className={'card-art ' + e.category.toLowerCase()}>
          <ViewTransition name={'cover-' + e.id} share="poster" default="none">
            <picture className="card-picture">
              {cover(e).startsWith('/art/') && (
                <source
                  media="(max-width:700px)"
                  type="image/avif"
                  srcSet={cover(e).replace('/art/', '/art/small/').replace('.webp', '.avif')}
                />
              )}
              <Image
                fill
                unoptimized
                sizes="(max-width:520px) 94vw,(max-width:700px) 46vw,30vw"
                src={cover(e)}
                alt={e.category + ' print for ' + e.title}
              />
            </picture>
          </ViewTransition>
          <ViewTransition name={'date-' + e.id} share="poster" default="none">
            <span className="date-tab">
              <span>{date(e.starts_at, { month: 'short' }, e.timezone)}</span>
              <b>{date(e.starts_at, { day: '2-digit' }, e.timezone)}</b>
            </span>
          </ViewTransition>
        </div>
        <div className="card-info">
          <div className="card-top">
            <span className={'kind ' + e.category.toLowerCase()}>{e.category}</span>
            {Date.parse(e.ends_at) > Date.now() ? (
              <Meter compact capacity={e.capacity} attending={e.attending} />
            ) : (
              <span className="seats">Past event</span>
            )}
          </div>
          <ViewTransition name={'title-' + e.id} share="poster" default="none">
            <h3>{e.title}</h3>
          </ViewTransition>
          <p>
            <CalendarDays />
            {day(e.starts_at, e.timezone)} · {time(e.starts_at, e.timezone)}
          </p>
          <p>
            <MapPin />
            {e.venue}
          </p>
        </div>
      </Link>
      <button
        className={'save ' + (saved ? 'on' : '')}
        aria-pressed={saved}
        aria-label={(saved ? 'Unsave ' : 'Save ') + e.title}
        onClick={toggle}
      >
        <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </motion.article>
  )
}
