-- Local programme only. Fixtures are owned by fixed IDs so setup can safely run again.
with items(id,offset_days,title,category,venue,cap,blurb) as (values
 ('a797c160-a6cb-48af-af3c-411b271ec601'::uuid,3,'Small Signals','Talk','Signal Room',60,'An afternoon of tiny machines. Follow the path from a noisy sensor to a signal you can trust, then stay for questions and a tabletop demonstration.'),
 ('a797c160-a6cb-48af-af3c-411b271ec602',35,'Sound in the Browser','Workshop','Media Lab',30,'Build a playable instrument with the Web Audio API. Bring headphones and a laptop. We will share our instruments at the end of the session.'),
 ('a797c160-a6cb-48af-af3c-411b271ec603',41,'Boardwalk Games','Social','Society Common Room',50,'An afternoon for board games, short rounds and new faces. The committee will bring games and help everyone find a table.'),
 ('a797c160-a6cb-48af-af3c-411b271ec604',-9,'First Pull Request','Workshop','Computing Lab 2',30,'A hands-on introduction to reading an issue, making a small change and working through a friendly code review.'))
insert into society.events(id,title,category,venue,capacity,room_limit,description,starts_at,ends_at,state)
select id,title,category,venue,cap,cap,blurb,t,t+interval '3 hours',case when offset_days<0 then 'archived' else 'published' end from items cross join lateral(select (current_date+offset_days+time '14:00') at time zone 'Asia/Dhaka' t)s on conflict(id) do nothing;
insert into society.speakers(event_id,name,bio,avatar)
select id,'Samira Hasan','Embedded systems researcher and society alumna.',3 from society.events where id='a797c160-a6cb-48af-af3c-411b271ec601' on conflict do nothing;
insert into society.agenda_sessions(event_id,title,starts_at,ends_at,room,track,speaker_id,position)
select e.id,title_part,e.starts_at+mins*interval '1 minute',e.starts_at+(mins+duration)*interval '1 minute',e.venue,'Main programme',s.id,mins from society.events e join society.speakers s on s.event_id=e.id cross join(values ('From noise to signal',0,45),('Bench demonstration',60,40),('Open questions',105,30)) a(title_part,mins,duration)
where e.id='a797c160-a6cb-48af-af3c-411b271ec601' and not exists(select 1 from society.agenda_sessions x where x.event_id=e.id);
insert into society.tags select 'a797c160-a6cb-48af-af3c-411b271ec601',v from(values('Hardware'),('Beginner friendly'))x(v) on conflict do nothing;
