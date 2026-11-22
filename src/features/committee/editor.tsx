'use client'
import { eventInput, eventEdit } from '@contracts/events'
import { wallTime, instant } from '@/lib/campus-time'
import { useState } from 'react'
import { api, reason } from '@/services/api-client'
import { art, day, time, categories, SocietyEvent, Category } from '@/lib/events'
import { Dialog } from '@/components/ui/dialog'
import { VenuePicker } from '@/features/committee/components/venue-picker'
export function Editor({
  event,
  close,
  done,
}: {
  event: SocietyEvent | null
  close: () => void
  done: () => void
}) {
  const local = (v?: string) => (v ? wallTime(v, event?.timezone || 'Asia/Dhaka') : '')
  const [title, setTitle] = useState(event?.title || ''),
    [category, setCategory] = useState<Category>(event?.category || 'Workshop'),
    [venue, setVenue] = useState(event?.venue || ''),
    [venueLatitude, setVenueLatitude] = useState<number | null>(event?.venue_latitude ?? null),
    [venueLongitude, setVenueLongitude] = useState<number | null>(event?.venue_longitude ?? null),
    [capacity, setCapacity] = useState(event?.capacity || 30),
    [description, setDescription] = useState(event?.description || ''),
    [start, setStart] = useState(local(event?.starts_at)),
    [end, setEnd] = useState(local(event?.ends_at)),
    [state, setState] = useState(event?.state || 'draft'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (end <= start) {
      setError('Choose an end time after the start.')
      return
    }
    setBusy(true)
    try {
      await api(
        'committee/events' + (event ? '/' + event.id : ''),
        event ? 'PATCH' : 'POST',
        (event ? eventEdit : eventInput).parse({
          ...(event ? { revision: event.revision } : {}),
          title,
          category,
          venue,
          venue_latitude: venueLatitude,
          venue_longitude: venueLongitude,
          capacity,
          description,
          starts_at: instant(start, event?.timezone || 'Asia/Dhaka'),
          ends_at: instant(end, event?.timezone || 'Asia/Dhaka'),
          state,
        }),
      )
      done()
    } catch (e) {
      setError(reason(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog title={event ? 'Edit event' : 'Create event'} close={() => !busy && close()}>
      {preview && (
        <section className="form editor invite-preview">
          <p className="eyebrow rust">Invite preview</p>
          <img src={art(category)} alt={category + ' event artwork'} />
          <span className={'kind ' + category.toLowerCase()}>{category}</span>
          <h2>{title}</h2>
          <p>
            {day(instant(start, event?.timezone || 'Asia/Dhaka'), event?.timezone)} ·{' '}
            {time(instant(start, event?.timezone || 'Asia/Dhaka'), event?.timezone)} –{' '}
            {day(instant(end, event?.timezone || 'Asia/Dhaka'), event?.timezone)},{' '}
            {time(instant(end, event?.timezone || 'Asia/Dhaka'), event?.timezone)} ·{' '}
            {event?.timezone || 'Dhaka time'}
          </p>
          <p>
            <b>{venue}</b> · {capacity} seats
          </p>
          <p className="preview-description">{description}</p>
          <button className="outline" onClick={() => setPreview(false)} autoFocus>
            Back to editing
          </button>
        </section>
      )}
      <form className="form editor" hidden={preview} onSubmit={save}>
        <p className="eyebrow rust">Committee workspace</p>
        <h2>{event ? 'Edit event' : 'Create an event'}</h2>
        <label>
          Event title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={2}
            maxLength={90}
            required
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Capacity
            <input
              type="number"
              min={1}
              max={10000}
              required
              value={capacity || ''}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </label>
        </div>
        <VenuePicker
          venue={venue}
          latitude={venueLatitude}
          longitude={venueLongitude}
          onVenue={setVenue}
          onCoordinates={(latitude, longitude) => {
            setVenueLatitude(latitude)
            setVenueLongitude(longitude)
          }}
        />
        <div className="form-row">
          <label>
            Starts · {event?.timezone || 'Dhaka time'}
            <input
              type="datetime-local"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Ends · {event?.timezone || 'Dhaka time'}
            <input
              type="datetime-local"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <label>
          About the event
          <textarea
            rows={4}
            required
            minLength={10}
            maxLength={4000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Visibility
          <select
            aria-label="Visibility"
            value={state}
            onChange={(e) => setState(e.target.value as SocietyEvent['state'])}
          >
            {event?.state !== 'published' && <option value="draft">Draft · committee only</option>}
            <option value="published">Published · visible to students</option>
          </select>
        </label>
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        <button
          className="outline"
          type="button"
          disabled={busy}
          onClick={(e) => {
            if (!e.currentTarget.form?.reportValidity()) return
            if (end <= start) {
              setError('Choose an end time after the start.')
              return
            }
            setError('')
            try {
              instant(start, event?.timezone || 'Asia/Dhaka')
              instant(end, event?.timezone || 'Asia/Dhaka')
              setPreview(true)
            } catch {
              setError(
                'Choose an unambiguous local time. This time falls within a daylight-saving change.',
              )
            }
          }}
        >
          Preview invite
        </button>
        <button className="solid" disabled={busy}>
          {busy
            ? 'Saving…'
            : event
              ? 'Save changes'
              : state === 'published'
                ? 'Publish event'
                : 'Save draft'}
        </button>
      </form>
    </Dialog>
  )
}
