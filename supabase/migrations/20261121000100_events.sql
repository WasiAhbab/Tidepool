create schema if not exists society;
revoke all on schema society from public, anon, authenticated;
create table society.committee (
  user_id uuid primary key references auth.users(id) on delete cascade,
  appointed_at timestamptz not null default now()
);
create table society.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 2 and 90),
  category text not null check(category in ('Hackathon','Workshop','Talk','Social')),
  description text not null check (length(description) between 10 and 4000),
  venue text not null check (length(venue) between 2 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null check(ends_at > starts_at),
  capacity integer not null check(capacity between 1 and 10000),
  state text not null default 'draft' check (state in ('draft','published','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table society.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references society.events(id),
  name text not null check (length(name) between 2 and 100),
  email text not null check(email=lower(trim(email))),
  status text not null check(status in ('confirmed','waitlisted','cancelled')),
  registered_at timestamptz not null default clock_timestamp(),
  checked_in_at timestamptz,
  unique(event_id,email)
);
create index registrations_queue on society.registrations(event_id,status,registered_at,id);
create index registrations_email on society.registrations(email);
create table society.challenges (
  id uuid primary key, email text not null, digest text not null,
  expires_at timestamptz not null, attempts integer not null default 0
);
create table society.sessions (
  digest text primary key, email text not null,
  committee_id uuid references society.committee(user_id) on delete cascade,
  expires_at timestamptz not null
);
create table society.rate_limits (
  key text primary key, hits integer not null, expires_at timestamptz not null
);
create table society.mail_queue (
  id bigint generated always as identity primary key,
  recipient text not null, subject text not null, body text not null,
  next_attempt timestamptz not null default now(), attempts integer not null default 0
);
