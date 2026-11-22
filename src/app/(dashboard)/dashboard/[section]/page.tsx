import { notFound } from 'next/navigation'
import { Door } from '@/features/checkin/components/door'
import { Analytics } from '@/features/analytics/components/report'
import { Announcements } from '@/features/announcements/components/composer'
import { AgendaBuilder } from '@/features/agenda/components/builder'
import { Team, Settings } from '@/features/committee/components/administration'
import { Dashboard } from '@/features/committee/dashboard'
const areas = {
  'check-in': ['Check-in', Door],
  analytics: ['Attendance analytics', Analytics],
  announcements: ['Announcements', Announcements],
  programme: ['Programme builder', AgendaBuilder],
  team: ['Committee team', Team],
  settings: ['Workspace settings', Settings],
} as const
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const key = (await params).section
  if (key === 'events') return <Dashboard />
  if (!Object.hasOwn(areas, key)) notFound()
  const [title, Content] = areas[key as keyof typeof areas]
  return (
    <section className="subpage">
      <div className="page-title">
        <h1>{title}</h1>
      </div>
      <Content />
    </section>
  )
}
