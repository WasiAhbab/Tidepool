import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { serverFetch } from '@/lib/server'
import { SocietyEvent, eventPath } from '@/lib/events'
import { EventDetail } from './detail'
import { cache } from 'react'
export const invitation = cache(async (key: string): Promise<SocietyEvent> => {
  const r = await serverFetch('events/' + encodeURIComponent(key))
  if ([404, 400].includes(r.status)) notFound()
  if (!r.ok) throw Error('Event unavailable')
  return r.json()
})
export async function Invitation({ slug, sheet = false }: { slug: string; sheet?: boolean }) {
  const e = await invitation(slug),
    origin = process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:3107',
    nonce = (await headers()).get('x-nonce') || undefined
  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: e.title,
            startDate: e.starts_at,
            endDate: e.ends_at,
            description: e.description,
            url: origin + eventPath(e),
            image: origin + eventPath(e) + '/share-image',
            eventStatus:
              'https://schema.org/' +
              (e.state === 'cancelled' ? 'EventCancelled' : 'EventScheduled'),
            location: { '@type': 'Place', name: e.venue },
            organizer: { '@type': 'Organization', name: 'Computer Science Society' },
          }).replaceAll('<', '\\u003c'),
        }}
      />
      <EventDetail initial={e} sheet={sheet} />
    </>
  )
}
