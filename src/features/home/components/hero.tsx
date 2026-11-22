'use client'
import dynamic from 'next/dynamic'
import { CalendarDays, Compass } from 'lucide-react'
import { Magnetic, SplitText } from '@/components/shared/movement'
const TideLayer = dynamic(() => import('@/components/shared/movement').then((m) => m.TideLayer), {
  ssr: false,
})
export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="hero"
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse') {
          const r = e.currentTarget.getBoundingClientRect()
          e.currentTarget.style.setProperty('--ripple-x', e.clientX - r.left + 'px')
          e.currentTarget.style.setProperty('--ripple-y', e.clientY - r.top + 'px')
        }
      }}
    >
      {children}
      <TideLayer />
      <div className="hero-copy">
        <div className="eyebrow hero-label">
          <span />
          Computer Science Society
        </div>
        <SplitText />
        <p>
          Workshops, talks, and late-night builds.
          <br />
          Find your next campus gathering.
        </p>
        <div className="hero-actions">
          <Magnetic>
            <a href="#events" className="solid">
              <Compass size={17} />
              Explore events
            </a>
          </Magnetic>
          <a href="/calendar" className="hero-calendar">
            <CalendarDays size={16} />
            Subscribe to the calendar
          </a>
        </div>
      </div>
    </section>
  )
}
