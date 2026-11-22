import type { PoolClient } from 'pg'
import { notify, confirmedCount } from '../events/events.repository'
export async function promote(c: PoolClient, id: string, title: string, capacity: number) {
  const seats = capacity - (await confirmedCount(c, id))
  if (seats <= 0) return
  const { rows } = await c.query(
    `with line as (select id,sum(party_size) over(order by registered_at,id) as seats from registrations where event_id=$1 and status='waitlisted')
 update registrations set status='confirmed' where id in(select id from line where seats<=$2) returning email`,
    [id, seats],
  )
  for (const row of rows)
    await notify(
      c,
      row.email,
      'A seat opened for ' + title,
      'Your place at ' + title + ' is confirmed.',
    )
}
