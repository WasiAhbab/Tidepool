import Image from 'next/image'
export function HeroArt() {
  return (
    <picture className="hero-art-wrap">
      <source media="(max-width: 700px)" srcSet="/art/hero-mobile.avif" />
      <Image
        className="hero-artwork"
        src="/art/hero.webp"
        fill
        loading="eager"
        fetchPriority="high"
        sizes="90vw"
        alt="Woodcut of waves breaking below copper cliffs"
      />
    </picture>
  )
}
