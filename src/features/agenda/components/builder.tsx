'use client'
import { useState } from 'react'
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { api, reason } from '@/services/api-client'
import { useResource } from '@/hooks/use-resource'
import { SocietyEvent } from '@/lib/events'
import { wallTime, instant } from '@/lib/campus-time'
import { EventChoice } from '@/features/committee/components/event-choice'
import { useForm, useFieldArray } from 'react-hook-form'
type Session = {
  title: string
  room: string
  track: string
  speaker: string
  starts_at: string
  ends_at: string
}
type Draft = {
  revision: number
  tags: string[]
  sessions: Session[]
  speakers: { name: string; bio: string; avatar: number }[]
  questions: { id?: string; label: string; required: boolean; options: string[] }[]
  resources: { label: string; url: string }[]
}
function Edit({
  event,
  initial,
  refresh,
}: {
  event: SocietyEvent
  initial: Draft
  refresh: () => void
}) {
  const [message, setMessage] = useState(''),
    [drag, setDrag] = useState<number | null>(null)
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<Draft>({
    defaultValues: {
      ...initial,
      sessions: initial.sessions.map((s) => ({
        ...s,
        starts_at: wallTime(s.starts_at, event.timezone),
        ends_at: wallTime(s.ends_at, event.timezone),
      })),
    },
  })
  const slots = useFieldArray({ control, name: 'sessions' }),
    people = useFieldArray({ control, name: 'speakers' }),
    questions = useFieldArray({ control, name: 'questions', keyName: 'fieldKey' }),
    resources = useFieldArray({ control, name: 'resources' })
  const names = watch('speakers')
  async function save(v: Draft) {
    setMessage('')
    try {
      await api('committee/events/' + event.id + '/programme', 'PUT', {
        revision: v.revision,
        tags: v.tags,
        speakers: v.speakers,
        sessions: v.sessions.map((s) => ({
          ...s,
          starts_at: instant(s.starts_at, event.timezone),
          ends_at: instant(s.ends_at, event.timezone),
        })),
        questions: v.questions,
        resources: v.resources,
      })
      refresh()
    } catch (e) {
      setMessage(reason(e))
    }
  }
  return (
    <form className="form programme-editor" onSubmit={handleSubmit(save)}>
      <label>
        Tags · comma separated
        <input
          defaultValue={initial.tags.join(', ')}
          {...register('tags', {
            setValueAs: (v) =>
              typeof v === 'string'
                ? v
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : v,
          })}
        />
      </label>
      <h2>Speakers</h2>
      {people.fields.map((f, i) => (
        <fieldset key={f.id}>
          <legend>Speaker {i + 1}</legend>
          <div className="form-row">
            <label>
              Name
              <input required {...register(`speakers.${i}.name`)} />
            </label>
            <label>
              Portrait
              <select {...register(`speakers.${i}.avatar`, { valueAsNumber: true })}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    Illustration {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Biography
            <textarea {...register(`speakers.${i}.bio`)} />
          </label>
          <button type="button" className="text-btn" onClick={() => people.remove(i)}>
            Remove speaker
          </button>
        </fieldset>
      ))}
      <button
        className="outline"
        type="button"
        onClick={() => people.append({ name: '', bio: '', avatar: 1 })}
      >
        Add speaker
      </button>
      <h2>Sessions</h2>
      <small>Times are in {event.timezone}. Sessions can run in parallel in different rooms.</small>
      {slots.fields.map((f, i) => (
        <fieldset
          key={f.id}
          draggable
          onDragStart={() => setDrag(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (drag !== null) slots.move(drag, i)
            setDrag(null)
          }}
        >
          <legend>Session {i + 1}</legend>
          <div className="reorder">
            <GripVertical size={16} />
            <button
              aria-label="Move earlier in programme"
              disabled={!i}
              type="button"
              onClick={() => slots.move(i, i - 1)}
            >
              <ChevronUp />
            </button>
            <button
              aria-label="Move later in programme"
              disabled={i === slots.fields.length - 1}
              type="button"
              onClick={() => slots.move(i, i + 1)}
            >
              <ChevronDown />
            </button>
          </div>
          <label>
            Session title
            <input required {...register(`sessions.${i}.title`)} />
          </label>
          <div className="form-row">
            <label>
              Start
              <input required type="datetime-local" {...register(`sessions.${i}.starts_at`)} />
            </label>
            <label>
              End
              <input required type="datetime-local" {...register(`sessions.${i}.ends_at`)} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Room
              <input required {...register(`sessions.${i}.room`)} />
            </label>
            <label>
              Track
              <input {...register(`sessions.${i}.track`)} />
            </label>
          </div>
          <label>
            Speaker
            <select {...register(`sessions.${i}.speaker`)}>
              <option value="">No speaker</option>
              {names.map((n, j) => (
                <option key={j}>{n.name}</option>
              ))}
            </select>
          </label>
          <button className="text-btn" type="button" onClick={() => slots.remove(i)}>
            Remove session
          </button>
        </fieldset>
      ))}
      <button
        className="outline"
        type="button"
        onClick={() =>
          slots.append({
            title: '',
            starts_at: wallTime(event.starts_at, event.timezone),
            ends_at: wallTime(event.ends_at, event.timezone),
            room: event.venue,
            track: '',
            speaker: '',
          })
        }
      >
        Add session
      </button>
      <h2>Registration questions</h2>
      {questions.fields.map((f, i) => (
        <fieldset key={f.fieldKey}>
          <legend>Question {i + 1}</legend>
          <label>
            Question
            <input required {...register(`questions.${i}.label`)} />
          </label>
          <label>
            Choices · comma separated, blank for free text
            <input
              defaultValue={f.options.join(', ')}
              {...register(`questions.${i}.options`, {
                setValueAs: (v) =>
                  typeof v === 'string'
                    ? v
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean)
                    : v,
              })}
            />
          </label>
          <label className="check-label">
            <input type="checkbox" {...register(`questions.${i}.required`)} />
            Required
          </label>
          <button className="text-btn" type="button" onClick={() => questions.remove(i)}>
            Remove question
          </button>
        </fieldset>
      ))}
      <button
        className="outline"
        type="button"
        onClick={() => questions.append({ label: '', required: false, options: [] })}
      >
        Add question
      </button>
      <h2>Resources</h2>
      {resources.fields.map((f, i) => (
        <fieldset key={f.id}>
          <legend>Resource {i + 1}</legend>
          <label>
            Label
            <input required {...register(`resources.${i}.label`)} />
          </label>
          <label>
            HTTPS link
            <input required type="url" {...register(`resources.${i}.url`)} />
          </label>
          <button type="button" className="text-btn" onClick={() => resources.remove(i)}>
            Remove resource
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="outline"
        onClick={() => resources.append({ label: '', url: '' })}
      >
        Add resource
      </button>
      {message && (
        <p className="alert" role="alert">
          {message}{' '}
          <button type="button" onClick={refresh}>
            Reload latest version
          </button>
        </p>
      )}
      <button className="solid" disabled={isSubmitting}>
        Save programme
      </button>
    </form>
  )
}
function Builder({ event }: { event: SocietyEvent }) {
  const { data, error, reload } = useResource<Draft>('committee/events/' + event.id + '/programme'),
    [saved, setSaved] = useState(false)
  return error ? (
    <p role="alert">{error}</p>
  ) : data ? (
    <>
      {saved && <p role="status">Programme saved.</p>}
      <Edit
        key={data.revision}
        event={event}
        initial={data}
        refresh={() => {
          setSaved(true)
          void reload()
        }}
      />
    </>
  ) : (
    <p>Loading programme…</p>
  )
}
export function AgendaBuilder() {
  return <EventChoice>{(e) => <Builder event={e} />}</EventChoice>
}
