create function society.appoint_member(actor_id uuid,address text,membership text) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
declare target uuid;
begin
 if not exists(select 1 from society.committee where user_id=actor_id and role='admin') then raise exception 'Admin required';end if;
 select id into target from auth.users where email=lower(trim(address)) and email_confirmed_at is not null;
 if target is null then return null;end if;
 insert into society.committee(user_id,role) values(target,membership) on conflict do nothing;
 return target;
end $$;
revoke all on function society.appoint_member(uuid,text,text) from public;
grant execute on function society.appoint_member(uuid,text,text) to tidepool_runtime;
alter table society.mail_queue add column created_at timestamptz not null default now();
