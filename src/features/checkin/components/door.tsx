'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, reason, ApiError } from '@/services/api-client'
import { useResource } from '@/hooks/use-resource'
import { useStaff } from '@/store/auth-store'
import { ScanLine, Volume2 } from 'lucide-react'
type Guest = { id: string; name: string; party_size: number; checked_in_at: string | null }
type Entry = {
  event: string
  body: { ticket: string } | { registration: string; checked: true }
  at: number
}
type Result = { name: string; already: boolean; checked_in_at: string }
type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorClass = new (opts: { formats: string[] }) => Detector
function Camera({ send, stop }: { send: (ticket: string) => void; stop: () => void }) {
  const ref = useRef<HTMLVideoElement>(null),
    [error, setError] = useState(''),
    callback = useRef(send)
  callback.current = send
  useEffect(() => {
    let live = true,
      stream: MediaStream | undefined,
      release: (() => void) | undefined,
      timer: ReturnType<typeof setTimeout> | undefined,
      last = '',
      stamp = 0
    const result = (text: string) => {
      if (!live || !text || (last === text && Date.now() - stamp < 2800)) return
      last = text
      stamp = Date.now()
      callback.current(text)
    }
    async function start() {
      const v = ref.current!
      const Native = (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector
      if (Native) {
        const reader = new Native({ formats: ['qr_code'] })
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        if (!live) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        v.srcObject = stream
        await v.play()
        const scan = async () => {
          if (!live) return
          try {
            for (const hit of await reader.detect(v)) result(hit.rawValue)
          } catch {}
          if (live) timer = setTimeout(scan, 220)
        }
        void scan()
      } else {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        if (!live) return
        const controls = await new BrowserQRCodeReader().decodeFromVideoDevice(
          undefined,
          v,
          (r) => {
            if (r) result(r.getText())
          },
        )
        release = () => controls.stop()
        if (!live) release()
      }
    }
    start().catch(() => {
      if (live) setError('Camera unavailable. Allow camera access or use name lookup below.')
    })
    return () => {
      live = false
      clearTimeout(timer)
      release?.()
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])
  return (
    <div className="scanner">
      <video playsInline muted ref={ref} aria-label="QR scanner camera" />
      {error && <p role="alert">{error}</p>}
      <button className="outline" onClick={stop}>
        Close camera
      </button>
    </div>
  )
}
export function Door() {
  const { data: events, error: eventsError } =
      useResource<{ id: string; title: string }[]>('check-in/events'),
    staff = useStaff((s) => s.staff),
    [chosen, choose] = useState(''),
    [q, search] = useState(''),
    [camera, setCamera] = useState(false),
    [sound, setSound] = useState(false),
    [message, setMessage] = useState(''),
    [queued, setQueued] = useState(0),
    [busy, setBusy] = useState(false),
    lock = useRef(false),
    sheet = useRef<HTMLElement>(null),
    event = chosen || events?.[0]?.id || '',
    key = 'tp.door.' + staff?.committee_id
  const { data, error, reload } = useResource<{ rows: Guest[]; checked: number; total: number }>(
    event ? 'check-in/' + event + '?q=' + encodeURIComponent(q) : null,
  )
  const read = useCallback((): Entry[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch {
      return []
    }
  }, [key])
  function store(list: Entry[]) {
    localStorage.setItem(key, JSON.stringify(list))
    setQueued(list.length)
  }
  async function sync() {
    if (lock.current || !navigator.onLine) return
    lock.current = true
    try {
      let list = read()
      while (list.length) {
        const [first, ...rest] = list
        try {
          if (Date.now() - first.at < 86400000)
            await api('committee/events/' + first.event + '/check-in', 'POST', first.body)
          else setMessage('An expired offline scan was discarded.')
        } catch (e) {
          if (!(e instanceof ApiError) || e.status >= 500 || e.status === 401 || e.status === 403)
            break
          setMessage(reason(e))
        }
        list = rest
        store(list)
      }
      await reload()
    } finally {
      lock.current = false
    }
  }
  const syncRef = useRef(sync)
  syncRef.current = sync
  useEffect(() => {
    setQueued(read().length)
    const online = () => void syncRef.current()
    window.addEventListener('online', online)
    void syncRef.current()
    return () => window.removeEventListener('online', online)
  }, [read])
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) void reload()
    }, 12000)
    return () => clearInterval(id)
  }, [reload])
  async function admit(body: Entry['body']) {
    if (!event || lock.current) return
    lock.current = true
    setBusy(true)
    setMessage('')
    try {
      const r = await api<Result>('committee/events/' + event + '/check-in', 'POST', body)
      setMessage(
        r.already
          ? r.name + ' already checked in at ' + new Date(r.checked_in_at).toLocaleTimeString()
          : r.name + ' checked in.',
      )
      navigator.vibrate?.(40)
      if (sound) {
        try {
          const ctx = new AudioContext(),
            osc = ctx.createOscillator(),
            gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          gain.gain.value = 0.035
          osc.frequency.value = 640
          osc.start()
          osc.stop(ctx.currentTime + 0.09)
          osc.onended = () => void ctx.close()
        } catch {}
      }
      await reload()
    } catch (e) {
      if (e instanceof TypeError || !navigator.onLine) {
        const list = read()
        if (!list.some((x) => x.event === event && JSON.stringify(x.body) === JSON.stringify(body)))
          list.push({ event, body, at: Date.now() })
        try {
          store(list)
          setMessage('Scan saved for verification. Confirm entry once the queue syncs.')
        } catch {
          setMessage('Device storage is unavailable. Reconnect and scan again.')
        }
      } else setMessage(reason(e))
    } finally {
      setBusy(false)
      lock.current = false
    }
  }
  return (
    <section className="door" ref={sheet}>
      <div className="row-actions">
        <button
          className="outline"
          onClick={() =>
            sheet.current
              ?.requestFullscreen?.()
              .catch(() => setMessage('Fullscreen is unavailable on this device.'))
          }
        >
          Full screen
        </button>
        <button className="outline" aria-pressed={sound} onClick={() => setSound(!sound)}>
          <Volume2 size={15} />
          Sound {sound ? 'on' : 'off'}
        </button>
      </div>
      <label className="event-choice">
        Event
        <select
          aria-label="Door event"
          value={event}
          onChange={(e) => {
            choose(e.target.value)
            setCamera(false)
          }}
        >
          {events?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </label>
      {eventsError && <p role="alert">{eventsError}</p>}
      {!events?.length && <p>No active events at the door.</p>}
      <div className="door-total">
        <b>{data?.checked || 0}</b> / {data?.total || 0} seats checked in
      </div>
      {event && (
        <button className="solid" onClick={() => setCamera(!camera)}>
          <ScanLine size={18} />
          Scan entry QR
        </button>
      )}
      {camera && <Camera send={(ticket) => void admit({ ticket })} stop={() => setCamera(false)} />}
      <p aria-live="polite">{message}</p>
      {queued > 0 && (
        <button className="outline" onClick={sync}>
          Sync {queued} pending scans
        </button>
      )}
      <label className="form">
        Find a guest
        <input
          aria-label="Find a guest"
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder="Name, email or pass number"
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {data?.rows.map((g) => (
        <div className="guest" key={g.id}>
          <div>
            <b>{g.name}</b>
            <small>
              Pass {g.id.slice(0, 8).toUpperCase()} · {g.party_size} seat(s)
            </small>
          </div>
          <button
            className="outline"
            disabled={busy || !!g.checked_in_at}
            onClick={() => admit({ registration: g.id, checked: true })}
          >
            {g.checked_in_at ? 'Checked in' : 'Check in'}
          </button>
        </div>
      ))}
      {data && !data.rows.length && <p className="empty">No confirmed guests match this search.</p>}
    </section>
  )
}
