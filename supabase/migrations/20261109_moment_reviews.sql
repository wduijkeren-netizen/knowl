-- Uitkomsten van 'Weet je dit nog?' (Wist ik nog / Vergeten), voor het herhaalschema van 1, 7 en 30 dagen.
create table if not exists public.moment_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  moment_id text not null,
  result text not null check (result in ('remembered', 'forgotten')),
  reviewed_at timestamptz not null default now()
);

create index if not exists moment_reviews_user_moment on public.moment_reviews (user_id, moment_id);

alter table public.moment_reviews enable row level security;

drop policy if exists "Eigen herhalingen lezen" on public.moment_reviews;
create policy "Eigen herhalingen lezen" on public.moment_reviews for select using (auth.uid() = user_id);

drop policy if exists "Eigen herhalingen opslaan" on public.moment_reviews;
create policy "Eigen herhalingen opslaan" on public.moment_reviews for insert with check (auth.uid() = user_id);
