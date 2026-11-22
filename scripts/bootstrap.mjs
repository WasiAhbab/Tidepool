import { readFile, readdir } from 'node:fs/promises'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
const db = new pg.Client({ connectionString: process.env.OWNER_DATABASE_URL })
const auth = createClient(process.env.SUPABASE_URL, process.env.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
await db.connect()
try {
  let ready = false
  for (let i = 0; i < 90 && !ready; i++) {
    try {
      ready = (await fetch(process.env.SUPABASE_URL + '/auth/v1/health')).ok
    } catch {}
    if (!ready) await new Promise((r) => setTimeout(r, 1000))
  }
  if (!ready) throw Error('Auth did not become ready.')
  await db.query('select pg_advisory_lock(8761302)')
  await db.query(
    'create table if not exists public.tidepool_schema_migrations(name text primary key)',
  )
  for (const name of (await readdir('supabase/migrations'))
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    if (
      (await db.query('select 1 from public.tidepool_schema_migrations where name=$1', [name]))
        .rowCount
    )
      continue
    await db.query('begin')
    try {
      await db.query(await readFile('supabase/migrations/' + name, 'utf8'))
      await db.query('insert into public.tidepool_schema_migrations values($1)', [name])
      await db.query('commit')
    } catch (e) {
      await db.query('rollback')
      throw e
    }
  }
  const password = process.env.DB_RUNTIME_PASSWORD
  if (!/^[a-f0-9]{50}$/.test(password || '')) throw Error('Invalid local database credential.')
  if (!(await db.query("select 1 from pg_roles where rolname='tidepool_app'")).rowCount)
    await db.query(
      "create role tidepool_app login password '" + password + "' in role tidepool_runtime",
    )
  await db.query(await readFile('supabase/seed.sql', 'utf8'))
  await db.query(await readFile('supabase/semester.sql', 'utf8'))
  let person = (
    await db.query('select id from auth.users where email=$1', [process.env.COMMITTEE_EMAIL])
  ).rows[0]
  if (!person) {
    const result = await auth.auth.admin.createUser({
      email: process.env.COMMITTEE_EMAIL,
      password: process.env.COMMITTEE_PASSWORD,
      email_confirm: true,
    })
    if (result.error) throw result.error
    person = result.data.user
  }
  await db.query(
    "insert into society.committee(user_id,role) values($1,'admin') on conflict do nothing",
    [person.id],
  )
} finally {
  await db.end()
}
