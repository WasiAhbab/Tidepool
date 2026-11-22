'use client'
import { useEffect, useState } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

export function Countdown({ to }: { to: string }) {
  const target = Date.parse(to),
    [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setLeft(target - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  if (left === null)
    return (
      <div className="sp-clock" aria-hidden="true" style={{ visibility: 'hidden' }}>
        00
      </div>
    )
  if (left <= 0) return <p className="sp-live">Kick-off has started</p>
  const s = Math.floor(left / 1000),
    parts = [
      ['days', Math.floor(s / 86400)],
      ['hours', Math.floor((s % 86400) / 3600)],
      ['minutes', Math.floor((s % 3600) / 60)],
      ['seconds', s % 60],
    ] as const
  return (
    <div
      className="sp-clock"
      role="timer"
      aria-label={parts[0][1] + ' days, ' + parts[1][1] + ' hours left'}
    >
      {parts.map(([label, value]) => (
        <div key={label}>
          <b>{pad(value)}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
