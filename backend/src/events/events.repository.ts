import type { Pool } from 'pg'
import { NotFoundException, ConflictException } from '@nestjs/common'
import type { PoolClient } from 'pg'
import { config } from '../config/env'
export const listing = `select e.*, coalesce((select sum(party_size)::int from registrations r where event_id=e.id and status='confirmed'),0) as attending,(select count(*)::int from registrations r where event_id=e.id and status='waitlisted') as waiting from events e`
export async function lockEvent(c: PoolClient, id: string, revision?: number) {
  const row = (await c.query('select * from events where id=$1 for update', [id])).rows[0]
  if (!row) throw new NotFoundException('Event not found.')
  if (revision !== undefined && row.revision !== revision)
    throw new ConflictException(
      'This event changed in another window. Reopen it to use the latest version.',
    )
  return row
}
export async function confirmedCount(c: PoolClient, id: string) {
  return Number(
    (
      await c.query(
        "select coalesce(sum(party_size),0) as used from registrations where event_id=$1 and status='confirmed'",
        [id],
      )
    ).rows[0].used,
  )
}
export async function notify(c: PoolClient, to: string, subject: string, body: string) {
  await c.query('insert into mail_queue(recipient,subject,body) values($1,$2,$3)', [
    to,
    subject,
    body + '\n\nYour passes: ' + config.origin + '/passes',
  ])
}
export async function audit(
  c: PoolClient,
  user: string | null,
  action: string,
  eventId: string | null,
  detail = '',
) {
  await c.query('insert into audit_log(actor,action,event_id,detail) values($1,$2,$3,$4)', [
    user,
    action,
    eventId,
    detail,
  ])
}

function publicEvent(row: Record<string, unknown>) {
  const out = { ...row }
  delete out.override_reason
  return out
}
export async function listInvitations(pool: Pool, scope?: string) {
  const condition =
    scope === 'archive'
      ? "(state='archived' or (state='published' and ends_at<=now())) order by starts_at desc"
      : "state='published' and ends_at>now() order by starts_at"
  return (await pool.query(listing + ' where ' + condition + ',id')).rows.map(publicEvent)
}
export async function findInvitation(pool: Pool, key: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(key)) throw new NotFoundException()
  const e = (
    await pool.query(listing + " where (e.slug=$1 or e.id::text=$1) and state<>'draft'", [key])
  ).rows[0]
  if (!e) throw new NotFoundException('This event is unavailable.')
  const queries = await Promise.all([
    pool.query('select * from speakers where event_id=$1 order by name', [e.id]),
    pool.query('select * from agenda_sessions where event_id=$1 order by starts_at,position', [
      e.id,
    ]),
    pool.query('select label from tags where event_id=$1 order by label', [e.id]),
    pool.query('select * from custom_questions where event_id=$1 and active order by position', [
      e.id,
    ]),
    pool.query(
      "select left(trim(name),1) as initial from registrations where event_id=$1 and listed and status='confirmed' order by registered_at limit 8",
      [e.id],
    ),
  ])
  return {
    ...publicEvent(e),
    speakers: queries[0].rows,
    agenda: queries[1].rows,
    tags: queries[2].rows.map((r) => r.label),
    questions: queries[3].rows,
    initials: queries[4].rows.map((r) => r.initial),
  }
}
