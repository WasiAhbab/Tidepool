-- Only installed by local development setup.
with lineup(offset_days,hour,title,category,venue,capacity,hours,description) as (values
 (7,9,'Midnight Build','Hackathon','Innovation Hall',120,24,'Bring your laptop, a half-formed idea, and the people you love building with. Spend a day and a night turning a campus problem into a working prototype. Solo builders are welcome. We will form teams at check-in and finish with short demos.'),
 (10,14,'Creative Coding Lab','Workshop','Design Studio B',30,3,'Make a living poster with code. We will start with a sketch, add motion and colour in p5.js, and end with a miniature gallery of everyone’s work. Bring a laptop with a modern browser. First-time coders are welcome.'),
 (14,16,'Beyond the Algorithm','Talk','Main Auditorium',300,2,'An open conversation about the people behind our software. Join the society for a guest lecture on how research ideas become everyday systems, followed by an audience Q&A.'),
 (17,15,'Common Grounds','Social','Courtyard Café',45,2,'Meet society members over coffee, swap project ideas, and join a table for board games. Drop in on your own or bring a friend. The committee will be there to introduce people.'),
 (21,10,'Systems Under Load','Workshop','Computing Lab 2',35,3,'Trace a request through an application and learn where time goes under load. Work in pairs on a small service, measure its bottlenecks, and compare changes. Bring your laptop.'),
 (26,17,'Open Source Evenings','Talk','Innovation Hall',100,2,'Hear the stories behind first contributions, meet maintainers from the campus community, and bring an issue you would like help with. The evening closes with a practical contributor Q&A.')
), times as (select *, ((now() at time zone 'Asia/Dhaka')::date + offset_days + make_time(hour,0,0)) at time zone 'Asia/Dhaka' as start from lineup)
insert into society.events(title,category,venue,capacity,description,starts_at,ends_at,state)
select title,category,venue,capacity,description,start,start+make_interval(hours=>hours),'published' from times
where not exists(select 1 from society.events);
