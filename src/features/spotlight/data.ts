import { serverFetch } from '@/lib/server'
import type { SocietyEvent } from '@/lib/events'

export async function loadEvents(scope?: 'archive'): Promise<SocietyEvent[]> {
  const r = await serverFetch(scope ? 'events?scope=archive' : 'events')
  if (!r.ok) throw Error('Events unavailable')
  return r.json()
}
export const left = (e: SocietyEvent) => (e.waiting > 0 ? 0 : Math.max(0, e.capacity - e.attending))
export const live = (e: SocietyEvent) =>
  e.state === 'published' && Date.parse(e.ends_at) > Date.now()
