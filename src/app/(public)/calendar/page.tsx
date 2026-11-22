import { CalendarDays, RefreshCw, Smartphone } from 'lucide-react'
import { CalendarSubscribe } from '@/features/calendar/components/subscribe'
import { siteOrigin } from '@/lib/site'

export const metadata = {
  title: 'Subscribe to the calendar',
  description: 'Keep Computer Science Society events in sync with your calendar.',
}

export default function CalendarPage() {
  const origin = siteOrigin(),
    feedUrl = origin + '/api/v1/calendar/semester.ics',
    webcalUrl = feedUrl.replace(/^https?:/, 'webcal:')

  return (
    <div className="container calendar-page">
      <p className="eyebrow rust">A little easier to plan</p>
      <h1>Good things, on your calendar.</h1>
      <p className="calendar-lede">
        Subscribe once and the Computer Science Society’s upcoming events stay close at hand.
        Changes to dates and venues flow through automatically.
      </p>
      <CalendarSubscribe feedUrl={feedUrl} webcalUrl={webcalUrl} />
      <div className="calendar-notes">
        <article>
          <CalendarDays size={19} />
          <h2>One feed for the semester</h2>
          <p>Workshops, talks, hackathons and socials arrive together in one tidy calendar.</p>
        </article>
        <article>
          <RefreshCw size={19} />
          <h2>Stays up to date</h2>
          <p>New events and schedule changes appear as your calendar refreshes its subscription.</p>
        </article>
        <article>
          <Smartphone size={19} />
          <h2>Works where you plan</h2>
          <p>Use the subscription link on a phone, or copy the feed into your calendar settings.</p>
        </article>
      </div>
    </div>
  )
}
