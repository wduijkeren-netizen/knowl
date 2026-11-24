-- Toetsplanner: een leerdoel per toets, met datum, benodigde studietijd en studiedagen.
create table if not exists public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject text not null,
  title text not null,
  exam_date date not null,
  goal text,
  target_minutes integer not null check (target_minutes > 0),
  study_days smallint[] not null default '{0,1,2,3,4}',
  start_date date not null default current_date,
  agenda_event_id uuid,
  created_at timestamptz not null default now()
);

alter table public.study_goals enable row level security;

drop policy if exists "Eigen leerdoelen lezen" on public.study_goals;
create policy "Eigen leerdoelen lezen" on public.study_goals for select using (auth.uid() = user_id);
drop policy if exists "Eigen leerdoelen toevoegen" on public.study_goals;
create policy "Eigen leerdoelen toevoegen" on public.study_goals for insert with check (auth.uid() = user_id);
drop policy if exists "Eigen leerdoelen wijzigen" on public.study_goals;
create policy "Eigen leerdoelen wijzigen" on public.study_goals for update using (auth.uid() = user_id);
drop policy if exists "Eigen leerdoelen verwijderen" on public.study_goals;
create policy "Eigen leerdoelen verwijderen" on public.study_goals for delete using (auth.uid() = user_id);
