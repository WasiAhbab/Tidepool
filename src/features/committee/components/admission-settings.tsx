'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog } from '@/components/ui/dialog'
import { SocietyEvent, cover } from '@/lib/events'
import { wallTime, instant } from '@/lib/campus-time'
import { api, reason } from '@/services/api-client'
type Values = {
  room_limit: number
  override_reason: string
  timezone: string
  email_domain: string
  opens_at: string
  closes_at: string
  plus_one: boolean
  waitlist_enabled: boolean
}
export function AdmissionSettings({
  e,
  close,
  done,
}: {
  e: SocietyEvent
  close: () => void
  done: () => void
}) {
  const [art, setArt] = useState(e.cover || cover(e)),
    [error, setError] = useState(''),
    [uploading, setUploading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      room_limit: e.room_limit || e.capacity,
      override_reason: e.override_reason || '',
      timezone: e.timezone,
      email_domain: e.email_domain || '',
      opens_at: e.opens_at ? wallTime(e.opens_at, e.timezone) : '',
      closes_at: e.closes_at ? wallTime(e.closes_at, e.timezone) : '',
      plus_one: e.plus_one,
      waitlist_enabled: e.waitlist_enabled,
    },
  })
  return (
    <Dialog title="Admission settings" close={close}>
      <form
        className="form editor"
        onSubmit={handleSubmit(async (v) => {
          try {
            await api('committee/events/' + e.id + '/settings', 'PUT', {
              ...v,
              room_limit: Number(v.room_limit),
              cover: art,
              revision: e.revision,
              opens_at: v.opens_at ? instant(v.opens_at, v.timezone) : null,
              closes_at: v.closes_at ? instant(v.closes_at, v.timezone) : null,
            })
            done()
          } catch (err) {
            setError(reason(err))
          }
        })}
      >
        <h2>Admission settings</h2>
        <p>{e.title}</p>
        <label>
          Room limit
          <input type="number" required min={1} max={10000} {...register('room_limit')} />
        </label>
        <label>
          Room override approval
          <input maxLength={240} {...register('override_reason')} />
        </label>
        <label>
          Event timezone
          <select {...register('timezone')}>
            {Intl.supportedValuesOf('timeZone')
              .concat('UTC')
              .map((v) => (
                <option key={v}>{v}</option>
              ))}
          </select>
        </label>
        <label>
          Allowed email domain
          <input placeholder="Leave blank to welcome everyone" {...register('email_domain')} />
        </label>
        <div className="form-row">
          <label>
            Registration opens
            <input type="datetime-local" {...register('opens_at')} />
          </label>
          <label>
            Registration closes
            <input type="datetime-local" {...register('closes_at')} />
          </label>
        </div>
        <label className="check-label">
          <input type="checkbox" {...register('plus_one')} />
          Allow one accompanying guest
        </label>
        <label className="check-label">
          <input type="checkbox" {...register('waitlist_enabled')} />
          Keep a waiting list
        </label>
        <fieldset>
          <legend>Invitation cover</legend>
          <div className="cover-picker">
            {['hackathon', 'workshop', 'talk', 'social']
              .flatMap((c) => ['', '-2', '-3'].map((v) => '/art/' + c + v + '.webp'))
              .map((src) => (
                <button
                  type="button"
                  key={src}
                  aria-label={'Choose ' + src.slice(5, -5) + ' artwork'}
                  aria-pressed={src === art}
                  onClick={() => setArt(src)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
          </div>
          <label>
            Upload your own · up to 1 MB
            <input
              type="file"
              accept="image/jpeg,image/webp,image/png,image/avif"
              onChange={async (ev) => {
                const f = ev.target.files?.[0]
                if (!f) return
                if (f.size > 1000000) {
                  setError('Choose an image under 1 MB.')
                  return
                }
                setUploading(true)
                try {
                  const data = await new Promise<string>((resolve, reject) => {
                    const r = new FileReader()
                    r.onload = () => resolve(String(r.result).split(',')[1])
                    r.onerror = reject
                    r.readAsDataURL(f)
                  })
                  setArt((await api<{ url: string }>('committee/covers', 'POST', { data })).url)
                  setError('')
                } catch (err) {
                  setError(reason(err))
                } finally {
                  setUploading(false)
                }
              }}
            />
          </label>
          {art.startsWith('/api') && <img width={120} src={art} alt="Uploaded event cover" />}
        </fieldset>
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        <button className="solid" disabled={isSubmitting || uploading}>
          Save admission settings
        </button>
      </form>
    </Dialog>
  )
}
