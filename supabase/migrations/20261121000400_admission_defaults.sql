update society.events set room_limit=capacity where room_limit is null;
create function society.default_room_limit() returns trigger language plpgsql set search_path=pg_catalog as $$ begin
 if new.room_limit is null then new.room_limit:=new.capacity; end if;
 return new;
end $$;
create trigger event_room_default before insert on society.events for each row execute function society.default_room_limit();
alter table society.events alter column room_limit set not null;
create table society.command_receipts(event_id uuid not null references society.events on delete cascade,request_key uuid not null,actor_key text not null,kind text not null,result jsonb not null,primary key(event_id,request_key));
alter table society.command_receipts enable row level security;
create policy server_only on society.command_receipts to tidepool_runtime using(true) with check(true);
grant select,insert,delete on society.command_receipts to tidepool_runtime;
