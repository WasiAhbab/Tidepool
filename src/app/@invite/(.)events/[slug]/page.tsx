import { Invitation } from '@/features/events/invitation'
import { InviteSheet } from '@/features/events/invite-sheet'
export default async function QuickView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <InviteSheet slug={slug}>
      <Invitation slug={slug} sheet />
    </InviteSheet>
  )
}
