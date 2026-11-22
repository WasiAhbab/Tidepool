create table society.attendee_profiles (
  email text primary key check (email = lower(trim(email))),
  name text not null check (length(name) between 2 and 100),
  university text not null check (length(university) between 2 and 160),
  academic_level text not null check (academic_level in ('Bachelor', 'Master', 'Other')),
  subject text not null check (length(subject) between 2 and 120),
  study_period text not null check (length(study_period) between 1 and 48),
  phone text not null check (length(phone) between 7 and 30),
  updated_at timestamptz not null default now()
);

alter table society.events
  add column venue_latitude double precision check (venue_latitude between -90 and 90),
  add column venue_longitude double precision check (venue_longitude between -180 and 180),
  add constraint event_venue_coordinates_pair check (
    (venue_latitude is null and venue_longitude is null) or
    (venue_latitude is not null and venue_longitude is not null)
  );

grant select, insert, update, delete on society.attendee_profiles to tidepool_runtime;
