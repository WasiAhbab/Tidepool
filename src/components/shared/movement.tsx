'use client'
import {
  motion,
  MotionConfig,
  useReducedMotion,
  useInView,
  useSpring,
  useTransform,
  useScroll,
  animate,
} from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motionTokens as t } from '@/lib/motion'
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={t.spring}>
      {children}
    </MotionConfig>
  )
}

export function SplitText() {
  return (
    <h1 aria-label="Better together.">
      <span aria-hidden="true" className="word-reveal">
        Better
      </span>{' '}
      <em aria-hidden="true" className="word-reveal second-word">
        together.
      </em>
    </h1>
  )
}
export function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion(),
    [n, setN] = useState(value),
    last = useRef(value)
  useEffect(() => {
    const from = last.current
    last.current = value
    if (reduced) {
      setN(value)
      return
    }
    const c = animate(from, value, { ...t.reveal, onUpdate: (v) => setN(Math.round(v)) })
    return () => c.stop()
  }, [value, reduced])
  return <span>{n}</span>
}
export function Magnetic({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion(),
    x = useSpring(0, t.spring),
    y = useSpring(0, t.spring)
  return (
    <motion.span
      className="magnetic"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== 'mouse') return
        const b = e.currentTarget.getBoundingClientRect()
        x.set(((e.clientX - b.left - b.width / 2) / b.width) * t.magnet)
        y.set(((e.clientY - b.top - b.height / 2) / b.height) * t.magnet)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.span>
  )
}
export function TideLayer() {
  const ref = useRef<HTMLDivElement>(null),
    seen = useInView(ref),
    reduced = useReducedMotion(),
    { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] }),
    y = useTransform(scrollYProgress, [0, 1], [-t.parallax, t.parallax])
  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className={'tide-layer ' + (seen && !reduced ? 'moving' : '')}
      style={{ y: reduced ? 0 : y }}
    />
  )
}
