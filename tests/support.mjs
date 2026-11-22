import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import pg from 'pg'
import { execFileSync } from 'node:child_process'
export const origin = process.env.PUBLIC_ORIGIN
if (
  !['http://127.0.0.1:3107', 'http://127.0.0.1:3137'].includes(origin) ||
  !/^postgres(?:ql)?:\/\/[^/]+@127\.0\.0\.1:55432\/postgres(?:\?|$)/.test(
    process.env.DATABASE_URL,
  ) ||
  process.env.LOCAL_MAILBOX !== 'http://127.0.0.1:55434'
)
  throw new Error('Tests require the isolated local Tidepool stack.')
const local = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)
if (new URL(local.DB_URL).port !== '55432') throw new Error('Unexpected local database port.')
export const pool = new pg.Pool({
  connectionString: local.DB_URL,
  options: '-c search_path=society,public',
})
export const tag = randomUUID().slice(0, 8)
export const account = { email: tag + '-staff@tidepool.test', password: randomUUID() }
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const fixture = await admin.auth.admin.createUser({ ...account, email_confirm: true })
if (fixture.error) throw fixture.error
await pool.query('insert into committee(user_id) values($1)', [fixture.data.user.id])
export async function request(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const res = await fetch(origin + '/api/v1/' + path, {
    method,
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, data, cookie: res.headers.get('set-cookie')?.split(';')[0] }
}
export async function codeFor(email) {
  for (let i = 0; i < 24; i++) {
    const r = await fetch(
      process.env.LOCAL_MAILBOX +
        '/api/v1/search?query=' +
        encodeURIComponent('to:' + email + ' subject:"Your Tidepool sign-in code"'),
    )
    const msg = (await r.json()).messages[0]
    if (msg) {
      const mail = await (
        await fetch(process.env.LOCAL_MAILBOX + '/api/v1/message/' + msg.ID)
      ).json()
      const code = mail.Text?.match(/code is (\d{6})/)
      if (code) return code[1]
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error('Verification email missing from Mailpit')
}
export async function guest(email) {
  const challenge = await request('auth/code', { method: 'POST', body: { email } })
  assert.equal(challenge.status, 200)
  const login = await request('auth/verify', {
    method: 'POST',
    body: { id: challenge.data.id, code: await codeFor(email) },
  })
  assert.equal(login.status, 200)
  return login.cookie
}
export const payload = (overrides = {}) => ({
  title: 'QA ' + tag,
  category: 'Workshop',
  description: 'Test admission for a timed workshop.',
  venue: 'Test classroom',
  starts_at: new Date(Date.now() + 86400000 * 3).toISOString(),
  ends_at: new Date(Date.now() + 86400000 * 3 + 3600000).toISOString(),
  capacity: 2,
  state: 'published',
  ...overrides,
})
export async function clean() {
  await pool.query(
    'delete from audit_log where actor=$1 or event_id in(select id from events where title like $2)',
    [fixture.data.user.id, 'QA ' + tag + '%'],
  )
  await pool.query(
    'delete from registrations where event_id in(select id from events where title like $1)',
    ['QA ' + tag + '%'],
  )
  await pool.query('delete from events where title like $1', ['QA ' + tag + '%'])
  for (const t of ['sessions', 'challenges'])
    await pool.query('delete from ' + t + ' where email like $1', [tag + '-%@tidepool.test'])
  await pool.query('delete from mail_queue where recipient like $1', [tag + '-%@tidepool.test'])
  await admin.auth.admin.deleteUser(fixture.data.user.id)
  await pool.end()
}
