alter table society.events add column revision integer not null default 1;
create role tidepool_runtime nologin;
grant usage on schema society to tidepool_runtime;
grant select on society.committee to tidepool_runtime;
grant select,insert,update on society.events,society.registrations to tidepool_runtime;
grant select,insert,update,delete on society.sessions,society.challenges,society.rate_limits,society.mail_queue to tidepool_runtime;
grant usage,select on all sequences in schema society to tidepool_runtime;
