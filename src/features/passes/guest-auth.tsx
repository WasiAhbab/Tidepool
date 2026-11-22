'use client'
import { useState } from 'react'
import { Mail, Ticket } from 'lucide-react'
import { api, reason } from '@/services/api-client'
export function GuestAuth({
  done,
  title = 'Find your passes',
  description = 'Use the email address you registered with to open your event passes.',
}: {
  done: (email: string) => void | Promise<void>
  title?: string
  description?: string
}) {
  const [email, setEmail] = useState(''),
    [id, setId] = useState(''),
    [code, setCode] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (id) {
        await api('auth/verify', 'POST', { id, code })
        await done(email.trim().toLowerCase())
      } else {
        const data = await api<{ id: string }>('auth/code', 'POST', { email })
        setId(data.id)
      }
    } catch (err) {
      setMessage(reason(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <span className="form-icon">{id ? <Mail /> : <Ticket />}</span>
      <h2>{id ? 'Check your inbox' : title}</h2>
      <p>
        {id
          ? 'Enter the six-digit code sent to ' + email + '. It expires in 10 minutes.'
          : description}
      </p>
      {id ? (
        <label>
          Verification code
          <input
            key="code"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
      ) : (
        <label>
          Email address
          <input
            key="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      )}
      {message && (
        <p role="alert" className="alert">
          {message}
        </p>
      )}
      <button className="solid" disabled={busy}>
        {busy ? 'Please wait…' : id ? 'Verify email' : 'Send my code'}
      </button>
      {id && (
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            setId('')
            setCode('')
            setMessage('')
          }}
        >
          Change email or request another code
        </button>
      )}
    </form>
  )
}
