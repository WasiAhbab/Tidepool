'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useResource } from '@/hooks/use-resource'
import { SocietyEvent } from '@/lib/events'
export function EventChoice({
  children,
}: {
  children: (event: SocietyEvent, reload: () => void) => React.ReactNode
}) {
  const { data, error, reload } = useResource<SocietyEvent[]>('committee/events'),
    search = useSearchParams(),
    [id, setId] = useState(search?.get('event') || '')
  useEffect(() => {
    setId(search?.get('event') || '')
  }, [search])
  const event =
    data?.find((e) => e.id === id) || data?.find((e) => e.state === 'published') || data?.[0]
  if (error)
    return (
      <p role="alert" className="alert">
        {error} <button onClick={reload}>Retry</button>
      </p>
    )
  if (!data) return <p role="status">Loading events…</p>
  if (!event) return <p>No events yet. Create one in Events.</p>
  return (
    <>
      <label className="event-choice">
        Event
        <select aria-label="Choose event" value={event.id} onChange={(e) => setId(e.target.value)}>
          {data.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} · {e.state}
            </option>
          ))}
        </select>
      </label>
      <div key={event.id}>{children(event, reload)}</div>
    </>
  )
}
