-- จำกัดการเดารหัสผ่านของแอดมินและไรเดอร์: ผิดครบ 5 ครั้งล็อก 5 นาที
create table if not exists public.login_rate_limits (
  role text primary key check (role in ('admin', 'rider')),
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.login_rate_limits enable row level security;

create or replace function public.record_login_failure(p_role text)
returns table (failed_attempts integer, locked_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('admin', 'rider') then
    raise exception 'Invalid login role';
  end if;

  return query
  insert into public.login_rate_limits as limits (role, failed_attempts, locked_until, updated_at)
  values (p_role, 1, null, now())
  on conflict (role) do update
  set
    failed_attempts = case
      when limits.locked_until is not null and limits.locked_until <= now() then 1
      else limits.failed_attempts + 1
    end,
    locked_until = case
      when limits.locked_until is not null and limits.locked_until > now() then limits.locked_until
      when limits.locked_until is not null and limits.locked_until <= now() then null
      when limits.failed_attempts + 1 >= 5 then now() + interval '5 minutes'
      else null
    end,
    updated_at = now()
  returning limits.failed_attempts, limits.locked_until;
end;
$$;

revoke all on function public.record_login_failure(text) from public;
grant execute on function public.record_login_failure(text) to service_role;

notify pgrst, 'reload schema';
