alter table society.committee add column role text not null default 'organizer' check(role in ('admin','organizer','volunteer'));
alter table society.events drop constraint events_state_check;
alter table society.events add constraint events_state_check check(state in ('draft','published','cancelled','archived'));
alter table society.events add column timezone text not null default 'Asia/Dhaka',
 add column room_limit int check(room_limit between 1 and 10000),
 add column override_reason text, add column waitlist_enabled boolean not null default true,
 add column plus_one boolean not null default false, add column email_domain text,
 add column opens_at timestamptz, add column closes_at timestamptz,
 add column cover text, add column resources jsonb not null default '[]',
 add column slug text generated always as (trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g'))||'-'||left(id::text,8)) stored,
 add constraint room_override check(room_limit is null or capacity<=room_limit or length(trim(coalesce(override_reason,'')))>=8),
 add constraint registration_window check(opens_at is null or closes_at is null or opens_at<closes_at);
create unique index events_slug on society.events(slug);
create index events_public_calendar on society.events(starts_at) where state='published';
alter table society.registrations add column party_size smallint not null default 1 check(party_size in(1,2)),
 add column listed boolean not null default false, add column consent_at timestamptz,
 add column pass_nonce uuid not null default gen_random_uuid(), add column identity_key text,
 add column request_key uuid;
update society.registrations set identity_key=email;
create unique index registration_active_identity on society.registrations(event_id,identity_key) where status<>'cancelled';
create unique index registration_request on society.registrations(event_id,email,request_key) where request_key is not null;
create table society.speakers(id uuid primary key default gen_random_uuid(),event_id uuid not null references society.events on delete cascade,name text not null, bio text not null default '',avatar smallint not null default 1 check(avatar between 1 and 4),unique(event_id,name));
create table society.agenda_sessions(id uuid primary key default gen_random_uuid(),event_id uuid not null references society.events on delete cascade, title text not null,starts_at timestamptz not null,ends_at timestamptz not null, room text not null,track text not null default '',speaker_id uuid references society.speakers on delete set null,position int not null,check(ends_at>starts_at));
create index agenda_by_event on society.agenda_sessions(event_id,starts_at,position);
create table society.tags(event_id uuid not null references society.events on delete cascade,label text not null,primary key(event_id,label));
create table society.custom_questions(id uuid primary key default gen_random_uuid(),event_id uuid not null references society.events on delete cascade,label text not null,required boolean not null default false,options text[] not null default '{}',position int not null,active boolean not null default true);
create table society.answers(registration_id uuid references society.registrations on delete cascade,question_id uuid references society.custom_questions on delete cascade,value text not null,primary key(registration_id,question_id));
create table society.announcements(id uuid primary key default gen_random_uuid(),event_id uuid not null references society.events on delete cascade,subject text not null,body text not null,audience text not null check(audience in('all','confirmed','waitlisted')),created_at timestamptz not null default now(),request_key uuid not null,unique(event_id,request_key));
create table society.feedback(registration_id uuid primary key references society.registrations on delete cascade,rating smallint not null check(rating between 1 and 5),comment text not null default '',created_at timestamptz not null default now());
create table society.reminders_sent(registration_id uuid references society.registrations on delete cascade,starts_at timestamptz not null,hours smallint not null check(hours in(2,24)),primary key(registration_id,starts_at,hours));
create table society.audit_log(id bigint generated always as identity primary key,actor uuid,action text not null,event_id uuid,detail text not null default '',created_at timestamptz not null default clock_timestamp());
create index audit_by_time on society.audit_log(created_at desc);
create table society.covers(id uuid primary key default gen_random_uuid(),image bytea not null check(octet_length(image)<=1500000),created_at timestamptz not null default now());
alter table society.mail_queue add column failed_at timestamptz;
create index mail_due on society.mail_queue(next_attempt,id) where failed_at is null;
grant select,insert,update,delete on society.speakers,society.agenda_sessions,society.tags,society.custom_questions,society.answers,society.feedback,society.reminders_sent to tidepool_runtime;
grant select,insert on society.audit_log,society.announcements,society.covers to tidepool_runtime;
grant update(role) on society.committee to tidepool_runtime;
grant usage,select on all sequences in schema society to tidepool_runtime;
do $$ declare tab record; begin
 for tab in select tablename from pg_tables where schemaname='society' loop
 execute format('alter table society.%I enable row level security',tab.tablename);
 execute format('create policy server_only on society.%I to tidepool_runtime using(true) with check(true)',tab.tablename);
 end loop;
end $$;
