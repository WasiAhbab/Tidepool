import type { Pool } from 'pg'
export function saveAttendeeFeedback(
  pool: Pool,
  id: string,
  email: string,
  rating: number,
  comment: string,
) {
  return pool.query(
    `insert into feedback(registration_id,rating,comment) select r.id,$3,$4 from registrations r join events e on e.id=r.event_id where r.id=$1 and r.email=$2 and r.checked_in_at is not null and e.ends_at<=now()
 on conflict(registration_id) do update set rating=excluded.rating,comment=excluded.comment`,
    [id, email, rating, comment],
  )
}
