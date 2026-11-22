import { Browse } from '@/features/events/browse'
import { HeroArt } from '@/features/home/components/hero-art'
import { Hero } from '@/features/home/components/hero'
import { serverFetch } from '@/lib/server'
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }
export default async function Home({ searchParams }: Props) {
  const [upcoming, archive, params] = await Promise.all([
    serverFetch('events'),
    serverFetch('events?scope=archive'),
    searchParams,
  ])
  if (!upcoming.ok || !archive.ok) throw Error('Events unavailable')
  const initial = Object.fromEntries(
    Object.entries(params).filter((v): v is [string, string] => typeof v[1] === 'string'),
  )
  return (
    <>
      <link
        rel="preload"
        as="image"
        type="image/avif"
        href="/art/hero-mobile.avif"
        media="(max-width: 700px)"
        fetchPriority="high"
      />
      <div className="container home">
        <Hero>
          <HeroArt />
        </Hero>
      </div>
      <Browse
        key={JSON.stringify(initial)}
        events={await upcoming.json()}
        archive={await archive.json()}
        initial={initial}
      />
    </>
  )
}
