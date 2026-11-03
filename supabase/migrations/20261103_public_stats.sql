-- Geeft alleen totalen terug (geen namen of inhoud), zodat de hoofdpagina echte cijfers kan tonen.
create or replace function public.public_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'users', (select count(*) from auth.users),
    'moments', (select count(*) from learning_moments),
    'minutes', (select coalesce(sum(duration_minutes), 0) from learning_moments)
  );
$$;

revoke all on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;
