import type { Database } from '../database/database'
import { config } from '../config/env'
import { cancellation } from '../passes/signing'
export async function maintain(db: Database) {
  await db.tx(async (c) => {
    const lock = (await c.query('select pg_try_advisory_xact_lock(8761301) ok')).rows[0].ok
    if (!lock) return
    const due = await c.query(
      `select r.id,r.event_id,r.email,r.pass_nonce,e.title,e.venue,e.starts_at,
       case when e.starts_at<=now()+interval '2 hours' then 2 else 24 end as hours
       from registrations r join events e on e.id=r.event_id
       where e.state='published' and r.status='confirmed' and r.checked_in_at is null
       and r.email not like '%@erased.invalid'
       and e.starts_at>now() and ((e.starts_at<=now()+interval '24 hours' and e.starts_at>now()+interval '23 hours')
       or (e.starts_at<=now()+interval '2 hours' and e.starts_at>now()+interval '1 hour'))
       and not exists(select 1 from reminders_sent s where s.registration_id=r.id and s.starts_at=e.starts_at
         and s.hours=case when e.starts_at<=now()+interval '2 hours' then 2 else 24 end)
       order by e.starts_at,r.id for update of r skip locked`,
    )
    for (const row of due.rows) {
      const inserted = await c.query(
        'insert into reminders_sent(registration_id,starts_at,hours) values($1,$2,$3) on conflict do nothing returning registration_id',
        [row.id, row.starts_at, row.hours],
      )
      if (!inserted.rowCount) continue
      const token = cancellation(row.id, row.event_id, row.pass_nonce, row.starts_at),
        cancel = config.origin + '/cancel#' + token
      await c.query('insert into mail_queue(recipient,subject,body) values($1,$2,$3)', [
        row.email,
        row.title + ' starts in about ' + row.hours + ' hours',
        'Meet us at ' +
          row.venue +
          '. View your pass: ' +
          config.origin +
          '/passes\n\n' +
          'Can no longer make it? Release your place for someone on the waitlist: ' +
          cancel,
      ])
    }
    await c.query(
      "delete from mail_queue where failed_at is not null and created_at<now()-interval '1 day'*$1",
      [Number(process.env.RETENTION_DAYS || 365)],
    )
    for (const table of ['sessions', 'challenges', 'rate_limits'])
      await c.query('delete from ' + table + ' where expires_at<now()')
    const stale = (
      await c.query(
        `select r.id from registrations r join events e on e.id=r.event_id where e.ends_at<now()-interval '1 day'*$1 and r.email not like '%@erased.invalid' limit 500 for update of r skip locked`,
        [Number(process.env.RETENTION_DAYS || 365)],
      )
    ).rows.map((r) => r.id)
    if (stale.length) {
      await c.query('delete from answers where registration_id=any($1::uuid[])', [stale])
      await c.query("update feedback set comment='' where registration_id=any($1::uuid[])", [stale])
      await c.query(
        "update registrations set email=id::text||'@erased.invalid',identity_key=null,name='Former attendee',listed=false,pass_nonce=gen_random_uuid() where id=any($1::uuid[])",
        [stale],
      )
    }
  })
}
