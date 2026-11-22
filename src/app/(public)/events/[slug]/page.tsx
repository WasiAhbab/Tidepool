import { Invitation, invitation } from '@/features/events/invitation'
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    e = await invitation(slug)
  return {
    title: e.title,
    description: e.description.slice(0, 180),
    openGraph: {
      title: e.title,
      description: e.description.slice(0, 180),
      images: [
        (process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:3107') + '/events/' + slug + '/share-image',
      ],
    },
  }
}
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Invitation slug={(await params).slug} />
}
