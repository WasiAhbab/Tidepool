'use client'
import { motion } from 'motion/react'
import { CountUp } from '@/components/shared/movement'
export function Meter({
  capacity,
  attending,
  compact = false,
}: {
  capacity: number
  attending: number
  compact?: boolean
}) {
  const ratio = Math.min(1, attending / capacity),
    left = Math.max(0, capacity - attending)
  return (
    <span
      className={
        'capacity-meter ' +
        (compact ? 'compact ' : '') +
        (left / capacity <= 0.15 ? 'near-full' : '')
      }
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle
          cx="10"
          cy="10"
          r="7.4"
          fill="none"
          stroke="currentColor"
          opacity=".22"
          strokeWidth="2.4"
        />
        <motion.circle
          cx="10"
          cy="10"
          r="7.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          transform="rotate(-90 10 10)"
          initial={false}
          animate={{ pathLength: Math.max(0.035, ratio) }}
        />
      </svg>
      <span>
        {left ? (
          <>
            <CountUp value={left} /> seats left
          </>
        ) : (
          'Full'
        )}
      </span>
    </span>
  )
}
