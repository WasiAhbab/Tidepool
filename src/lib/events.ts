import { icalendar } from '@contracts/calendar'
export type Category = 'Hackathon' | 'Workshop' | 'Talk' | 'Social'
export type Speaker = { id: string; name: string; bio: string; avatar: number }
export type AgendaSession = {
  id: string
  title: string
  room: string
  track: string
  starts_at: string
  ends_at: string
  speaker_id: string | null
  position: number
}
export type Question = { id: string; label: string; required: boolean; options: string[] }
export type SocietyEvent = {
  slug: string
  timezone: string
  room_limit: number | null
  override_reason: string | null
  plus_one: boolean
  waitlist_enabled: boolean
  opens_at: string | null
  closes_at: string | null
  email_domain: string | null
  cover: string | null
  resources: { label: string; url: string }[]
  tags?: string[]
  speakers?: Speaker[]
  agenda?: AgendaSession[]
  questions?: Question[]
  initials?: string[]

  revision: number
  id: string
  title: string
  category: Category
  description: string
  venue: string
  venue_latitude?: number | null
  venue_longitude?: number | null
  starts_at: string
  ends_at: string
  capacity: number
  state: 'draft' | 'published' | 'cancelled' | 'archived'
  attending: number
  waiting: number
}
export type Pass = {
  position: number | null
  qr: string | null
  party_size: number
  rating: number | null
  id: string
  name: string
  status: 'confirmed' | 'waitlisted'
  checked_in_at: string | null
  event: SocietyEvent
}
export const categories: Category[] = ['Hackathon', 'Workshop', 'Talk', 'Social']
export const zone = 'Asia/Dhaka'
export const date = (value: string, options: Intl.DateTimeFormatOptions, timezone = zone) =>
  new Intl.DateTimeFormat('en-US', { timeZone: timezone, ...options }).format(new Date(value))
export const day = (v: string, tz = zone) =>
  date(v, { weekday: 'short', month: 'short', day: 'numeric' }, tz)
export const time = (v: string, tz = zone) => date(v, { hour: 'numeric', minute: '2-digit' }, tz)
export const art = (c: Category) => '/art/' + c.toLowerCase() + '.webp'
export const cover = (e: SocietyEvent) => {
  const variant = (parseInt(e.id.slice(0, 4), 16) % 3) + 1
  return (
    e.cover || '/art/' + e.category.toLowerCase() + (variant === 1 ? '' : '-' + variant) + '.webp'
  )
}
export const eventPath = (e: SocietyEvent) => '/events/' + (e.slug || e.id)
export function calendar(e: SocietyEvent) {
  const url = URL.createObjectURL(new Blob([icalendar(e)], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = e.title + '.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
