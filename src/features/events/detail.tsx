'use client'
import { admission } from '@contracts/events'
import Image from 'next/image'
import Markdown from 'react-markdown'
import {
  RegistrationFields,
  StudentDetailsFields,
  emptyStudentDetails,
  type StudentDetails,
} from '@/features/registration/registration-fields'
import { Timeline } from '@/features/agenda/components/timeline'
import { Meter } from '@/components/ui/meter'
import { motion } from 'motion/react'
import { useState, useEffect, useRef, ViewTransition, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  CalendarDays,
  MapPin,
  Users,
  Ticket,
  Share2,
  CalendarPlus,
  Check,
} from 'lucide-react'
import { cover, SocietyEvent, date, time, Pass, calendar } from '@/lib/events'
import { api, myPasses, reason, ApiError } from '@/services/api-client'
import { GuestAuth } from '@/features/passes/guest-auth'
import { Dialog } from '@/components/ui/dialog'
// The quick-view sheet sits on top of the list that still shows the card, so sharing names
// there would put two elements with the same name on screen at once and the browser drops both.
function Shared({ name, sheet, children }: { name: string; sheet: boolean; children: ReactNode }) {
  if (sheet) return <>{children}</>
  return (
    <ViewTransition name={name} share="poster" default="none">
      {children}
    </ViewTransition>
  )
}

export function EventDetail({
  initial,
  sheet = false,
}: {
  initial: SocietyEvent
  sheet?: boolean
}) {
  const [event, setEvent] = useState(initial),
    [email, setEmail] = useState(''),
    [pass, setPass] = useState<Pick<Pass, 'status' | 'id'> | null>(null),
    [modal, setModal] = useState(false),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(''),
    [studentDetails, setStudentDetails] = useState<StudentDetails>(emptyStudentDetails),
    [error, setError] = useState(''),
    [feedback, setFeedback] = useState('')
  const requestKey = useRef(''),
    [shareOpen, setShareOpen] = useState(false),
    [joinQueue, setJoinQueue] = useState(false)
  const reload = () => api<SocietyEvent>('events/' + event.id).then(setEvent)
  useEffect(() => {
    let live = true
    myPasses()
      .then((data) => {
        if (live && data) {
          setPass(data.passes.find((p) => p.event.id === initial.id) || null)
          void api<(StudentDetails & { name: string }) | null>('auth/profile')
            .then((profile) => {
              if (!live) return
              if (profile) {
                setName(profile.name)
                setStudentDetails({
                  university: profile.university,
                  academic_level: profile.academic_level,
                  subject: profile.subject,
                  study_period: profile.study_period,
                  phone: profile.phone,
                })
              }
              setEmail(data.email)
            })
            .catch(() => {
              if (!live) return
              setError('Saved details could not be loaded. You can enter them below.')
              setEmail(data.email)
            })
        }
      })
      .catch((err) => {
        if (live && !(err instanceof ApiError && err.status === 401)) setFeedback(reason(err))
      })
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible')
        api<SocietyEvent>('events/' + initial.id)
          .then((v) => {
            if (live) setEvent(v)
          })
          .catch(() => {})
    }, 20000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [initial.id])
  const left = event.capacity - event.attending,
    closed =
      event.state !== 'published' ||
      Date.parse(event.starts_at) <= Date.now() ||
      (!!event.opens_at && Date.parse(event.opens_at) > Date.now()) ||
      (!!event.closes_at && Date.parse(event.closes_at) <= Date.now()) ||
      (!event.waitlist_enabled && left <= 0)
  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fields = new FormData(e.currentTarget)
    requestKey.current ||= crypto.randomUUID()
    setBusy(true)
    setError('')
    try {
      const registered = await api<Pick<Pass, 'status' | 'id'>>(
        'events/' + event.id + '/register',
        'POST',
        admission.parse({
          name,
          profile: studentDetails,
          waitlist: left <= 0 || event.waiting > 0 || joinQueue,
          answers: Object.fromEntries(
            (event.questions || []).map((q) => [q.id, String(fields.get(q.id) || '')]),
          ),
          website: fields.get('website') || '',
          companion: fields.has('companion'),
          listed: fields.has('listed'),
          consent: fields.has('consent'),
          request_key: requestKey.current,
        }),
      )
      setPass(registered)
      void reload().catch(() => {})
    } catch (err) {
      setError(reason(err))
      if (err instanceof ApiError && err.status === 401) setEmail('')
      void reload().catch(() => {})
    } finally {
      setBusy(false)
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href)
      setFeedback('Event link copied.')
    } catch {
      setFeedback(location.href)
    }
  }
  const buttonText = pass
    ? 'View your pass'
    : closed
      ? event.state === 'cancelled'
        ? 'Event cancelled'
        : 'Registration closed'
      : left <= 0 || event.waiting > 0
        ? 'Join the waitlist'
        : 'Register for event'
  return (
    <div className="container detail-page">
      {!sheet && (
        <Link transitionTypes={['nav-back']} href="/#events" className="back">
          <ChevronLeft size={16} />
          All events
        </Link>
      )}
      <div className="detail-grid">
        <div className={'detail-art ' + event.category.toLowerCase()}>
          <Shared name={'cover-' + event.id} sheet={sheet}>
            <picture>
              {cover(event).startsWith('/art/') && (
                <source
                  media="(max-width:700px)"
                  type="image/avif"
                  srcSet={cover(event).replace('/art/', '/art/small/').replace('.webp', '.avif')}
                />
              )}
              <Image
                width={768}
                height={512}
                unoptimized
                priority
                alt={event.category + ' print for ' + event.title}
                src={cover(event)}
              />
            </picture>
          </Shared>
          <div className="poster-foot">
            <span>Computer Science Society</span>
            <span>Tidepool</span>
          </div>
        </div>
        <section className="detail-copy">
          <span className={'kind ' + event.category.toLowerCase()}>{event.category}</span>
          <Shared name={'title-' + event.id} sheet={sheet}>
            <h1>{event.title}</h1>
          </Shared>
          <p className="host">Hosted by the Computer Science Society</p>
          <div className="facts">
            <div>
              <CalendarDays />
              <span>
                <Shared name={'date-' + event.id} sheet={sheet}>
                  <b>
                    {date(
                      event.starts_at,
                      {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      },
                      event.timezone,
                    )}
                  </b>
                </Shared>
                {time(event.starts_at, event.timezone)} –{' '}
                {date(event.ends_at, { month: 'short', day: 'numeric' }, event.timezone)},{' '}
                {time(event.ends_at, event.timezone)} · {event.timezone}
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <a
                  href={
                    'https://www.google.com/maps/search/?api=1&query=' +
                    encodeURIComponent(
                      event.venue_latitude != null && event.venue_longitude != null
                        ? `${event.venue_latitude},${event.venue_longitude}`
                        : event.venue,
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <b>{event.venue}</b>Open map
                </a>
              </span>
            </div>
            <div>
              <Users />
              <span>
                <b>
                  {event.state === 'cancelled'
                    ? 'Event cancelled'
                    : closed
                      ? 'Registration closed'
                      : left && !event.waiting
                        ? left + ' seats available'
                        : 'Waitlist open'}
                </b>
                <Meter capacity={event.capacity} attending={event.attending} /> · Free admission
              </span>
            </div>
          </div>
          <div className="booking-action">
            {pass ? (
              <Link className="solid wide" href="/passes">
                <Ticket size={18} />
                View your pass
              </Link>
            ) : (
              <motion.button
                whileTap={{ scale: 0.975 }}
                className="solid wide"
                disabled={closed}
                onClick={() => {
                  setError('')
                  setModal(true)
                }}
              >
                <Ticket size={18} />
                {buttonText}
              </motion.button>
            )}
          </div>
          <div className="detail-tools">
            <button onClick={() => setShareOpen(true)}>
              <Share2 size={16} />
              Share event
            </button>
            <button onClick={() => calendar(event)}>
              <CalendarPlus size={17} />
              Add to calendar
            </button>
          </div>
          {feedback && (
            <p className="feedback" role="status">
              {feedback}
            </p>
          )}
        </section>
      </div>
      <section className="body-copy">
        <p className="eyebrow rust">Event details</p>
        <h2>About this event</h2>
        <Markdown skipHtml>{event.description}</Markdown>
        <div className="tag-row">
          {event.tags?.map((t) => (
            <span className="kind" key={t}>
              {t}
            </span>
          ))}
        </div>
        {!!event.initials?.length && (
          <div className="guest-initials">
            <span>Who’s going</span>
            {event.initials.map((i, n) => (
              <b key={n}>{i}</b>
            ))}
          </div>
        )}
        <Timeline event={event} />
      </section>
      {shareOpen && (
        <Dialog title="Share invitation" close={() => setShareOpen(false)}>
          <section className="form">
            <h2>Share this invitation</h2>
            <p>{event.title}</p>
            <label>
              Event link
              <input
                readOnly
                value={typeof location !== 'undefined' ? location.href : ''}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button className="solid" onClick={share}>
              Copy link
            </button>
            <a
              className="outline"
              href={
                'mailto:?subject=' +
                encodeURIComponent(event.title) +
                '&body=' +
                encodeURIComponent(location.href)
              }
            >
              Share by email
            </a>
            <p role="status">{feedback}</p>
          </section>
        </Dialog>
      )}
      {modal && (
        <Dialog
          title="Event registration"
          close={() => {
            if (!busy) setModal(false)
          }}
        >
          {pass ? (
            <div className="form">
              <span className="form-icon burst">
                <Check />
              </span>
              <h2>
                {pass.status === 'confirmed' ? 'You’re on the list.' : 'You’re on the waitlist.'}
              </h2>
              <p>
                {pass.status === 'confirmed'
                  ? 'Your seat is confirmed for '
                  : 'We’ll email you if a seat opens for '}
                {event.title}.
              </p>
              <Link href="/passes" className="solid">
                Open my passes
              </Link>
            </div>
          ) : !email ? (
            <GuestAuth
              done={async (verifiedEmail) => {
                setName('')
                setStudentDetails(emptyStudentDetails)
                try {
                  const profile = await api<(StudentDetails & { name: string }) | null>(
                    'auth/profile',
                  )
                  if (profile) {
                    setName(profile.name)
                    setStudentDetails({
                      university: profile.university,
                      academic_level: profile.academic_level,
                      subject: profile.subject,
                      study_period: profile.study_period,
                      phone: profile.phone,
                    })
                  }
                } catch {
                  setError('Your email is verified, but saved details could not be loaded.')
                }
                setEmail(verifiedEmail)
              }}
              title="Reserve your spot"
              description={
                'Verify your email to register for ' + event.title + '. No account needed.'
              }
            />
          ) : (
            <form className="form" onSubmit={register}>
              <span className="form-icon">
                <Ticket />
              </span>
              <h2>{left && !event.waiting ? 'Reserve your spot' : 'Join the waitlist'}</h2>
              <p>
                {event.title} · {date(event.starts_at, { month: 'short', day: 'numeric' })}
              </p>
              <label>
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <RegistrationFields event={event} />
              <StudentDetailsFields value={studentDetails} onChange={setStudentDetails} />
              {event.plus_one && event.waitlist_enabled && left === 1 && (
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={joinQueue}
                    onChange={(e) => setJoinQueue(e.target.checked)}
                  />
                  Join the waitlist if my party needs two seats
                </label>
              )}
              <small>Verified email · {email}</small>
              {error && (
                <p className="alert" role="alert">
                  {error}
                </p>
              )}
              <button className="solid" disabled={busy || closed}>
                {busy
                  ? 'Saving…'
                  : left && !event.waiting
                    ? 'Confirm registration'
                    : 'Join waitlist'}
              </button>
            </form>
          )}
        </Dialog>
      )}
    </div>
  )
}
