'use client'
import { useState } from 'react'
import { useResource } from '@/hooks/use-resource'
import { Staff, useStaff } from '@/store/auth-store'
import { api, reason } from '@/services/api-client'
export function Team() {
  const { data, error, reload } =
      useResource<{ user_id: string; role: Staff['role']; email: string | null }[]>(
        'committee/team',
      ),
    [msg, setMsg] = useState(''),
    staff = useStaff((s) => s.staff)
  return (
    <>
      <form
        className="form"
        onSubmit={async (ev) => {
          ev.preventDefault()
          const f = ev.currentTarget
          try {
            await api('committee/team', 'POST', Object.fromEntries(new FormData(f)))
            f.reset()
            await reload()
            setMsg('Membership saved.')
          } catch (err) {
            setMsg(reason(err))
          }
        }}
      >
        <label>
          Verified Supabase email
          <input name="email" type="email" required />
        </label>
        <label>
          Initial role
          <select name="role">
            <option>volunteer</option>
            <option>organizer</option>
            <option>admin</option>
          </select>
        </label>
        <button className="outline">Add committee member</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {data?.map((m) => (
        <div className="guest" key={m.user_id}>
          <b>{m.email || 'Member ' + m.user_id.slice(0, 8)}</b>
          <label>
            Role{' '}
            <select
              disabled={m.user_id === staff?.committee_id}
              aria-label={'Role for ' + (m.email || m.user_id)}
              value={m.role}
              onChange={async (e) => {
                try {
                  await api('committee/team/' + m.user_id, 'PATCH', { role: e.target.value })
                  await reload()
                  setMsg('Role updated.')
                } catch (err) {
                  setMsg(reason(err))
                }
              }}
            >
              {['admin', 'organizer', 'volunteer'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <p role="status">{msg}</p>
    </>
  )
}
export function Settings() {
  const mail = useResource<{ pending: number; failed: number }>('committee/mail'),
    audit =
      useResource<
        { id: number; action: string; detail: string; title: string | null; created_at: string }[]
      >('committee/audit'),
    [msg, setMsg] = useState('')
  return (
    <>
      <h2 className="subhead">Mail delivery</h2>
      <p>
        {mail.data?.pending ?? '…'} queued · {mail.data?.failed ?? '…'} need attention
      </p>
      {!!mail.data?.failed && (
        <button
          className="outline"
          onClick={async () => {
            try {
              await api('committee/mail/retry', 'POST', {})
              await mail.reload()
              setMsg('Delivery retries queued.')
            } catch (e) {
              setMsg(reason(e))
            }
          }}
        >
          Retry failed deliveries
        </button>
      )}
      <p role="status">{msg}</p>
      <h2 className="subhead">Audit log</h2>
      {(mail.error || audit.error) && <p role="alert">{mail.error || audit.error}</p>}
      {audit.data?.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Event / detail</th>
              </tr>
            </thead>
            <tbody>
              {audit.data.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>{row.action.replaceAll('_', ' ').replace('.', ' · ')}</td>
                  <td>{[row.title, row.detail].filter(Boolean).join(' · ') || 'Society'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Committee actions will appear here.</p>
      )}
    </>
  )
}
