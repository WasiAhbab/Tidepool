import Image from 'next/image'

export type ArtKind = 'hackathons' | 'open-seats' | 'past-events' | 'society'

const images: Record<ArtKind, string> = {
  hackathons: '/art/hackathon-2.webp',
  'open-seats': '/art/workshop-2.webp',
  'past-events': '/art/social-2.webp',
  society: '/art/hero.webp',
}

const descriptions: Record<ArtKind, string> = {
  hackathons: 'Copper-lit late-night student hackathon artwork',
  'open-seats': 'Warm workshop scene ready for new attendees',
  'past-events': 'Social gathering artwork from the society archive',
  society: 'Tidal water beneath copper cliffs',
}

export function PageArt({ kind, alt }: { kind: ArtKind; alt?: string }) {
  return (
    <Image
      src={images[kind]}
      alt={alt ?? descriptions[kind]}
      fill
      priority
      sizes="100vw"
      className="sp-photo"
    />
  )
}
