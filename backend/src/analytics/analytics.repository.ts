import type { Pool } from 'pg'
export async function attendanceReport(pool: Pool) {
  const [events, daily, curve, repeat, feedback] = await Promise.all([
    pool.query(
      `select e.id,e.title,e.starts_at,e.capacity,coalesce(sum(r.party_size) filter(where r.status='confirmed'),0)::int confirmed,count(r.id) filter(where r.status='waitlisted')::int waiting,coalesce(sum(r.party_size) filter(where r.checked_in_at is not null),0)::int arrived,case when e.ends_at<now() then round(100.0*count(*) filter(where r.status='confirmed' and r.checked_in_at is null)/nullif(count(*) filter(where r.status='confirmed'),0),1) end no_show from events e left join registrations r on r.event_id=e.id where e.state in('published','archived') group by e.id order by e.starts_at`,
    ),
    pool.query(
      "select to_char(registered_at at time zone 'UTC','YYYY-MM-DD') as day,count(*)::int count from registrations where registered_at>=now()-interval '90 days' group by 1 order by 1",
    ),
    pool.query(
      "select date_trunc('hour',checked_in_at) as hour,count(*)::int count from registrations where checked_in_at>=now()-interval '90 days' group by 1 order by 1",
    ),
    pool.query(
      "select count(*)::int total from(select email from registrations where status='confirmed' and email not like '%@erased.invalid' group by email having count(distinct event_id)>1) s",
    ),
    pool.query(
      `select e.id,e.title,round(avg(f.rating)::numeric,1)::float as rating,count(*)::int responses
       from events e join registrations r on r.event_id=e.id join feedback f on f.registration_id=r.id
       where e.ends_at<=now() and e.state in('published','archived')
       group by e.id having count(*)>=3 order by e.starts_at desc`,
    ),
  ])
  return {
    events: events.rows,
    daily: daily.rows,
    curve: curve.rows,
    repeat: repeat.rows[0].total,
    feedback: feedback.rows,
  }
}
