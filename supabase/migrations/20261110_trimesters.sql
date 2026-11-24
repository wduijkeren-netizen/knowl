-- Vakken kunnen bij het hele schooljaar horen (terms leeg) of bij één of meer trimesters.
alter table public.subjects
  add column if not exists terms smallint[];

-- Startdatum van elk trimester per schooljaar. Trimester 1 begint standaard op 1 augustus.
create table if not exists public.school_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  school_year text not null,
  term smallint not null check (term between 1 and 4),
  starts_on date not null,
  unique (user_id, school_year, term)
);

alter table public.school_terms enable row level security;

drop policy if exists "Eigen trimesters lezen" on public.school_terms;
create policy "Eigen trimesters lezen" on public.school_terms for select using (auth.uid() = user_id);
drop policy if exists "Eigen trimesters toevoegen" on public.school_terms;
create policy "Eigen trimesters toevoegen" on public.school_terms for insert with check (auth.uid() = user_id);
drop policy if exists "Eigen trimesters wijzigen" on public.school_terms;
create policy "Eigen trimesters wijzigen" on public.school_terms for update using (auth.uid() = user_id);
drop policy if exists "Eigen trimesters verwijderen" on public.school_terms;
create policy "Eigen trimesters verwijderen" on public.school_terms for delete using (auth.uid() = user_id);
