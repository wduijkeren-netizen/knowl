-- Persoonlijk weekdoel in minuten (leeg = geen doel), gebruikt op het dashboard.
alter table public.profiles
  add column if not exists weekly_goal_minutes integer
  check (weekly_goal_minutes is null or weekly_goal_minutes between 1 and 10080);
