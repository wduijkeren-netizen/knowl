-- Extra type leermoment: opdracht.
alter table public.learning_moments drop constraint if exists learning_moments_moment_type_check;
alter table public.learning_moments add constraint learning_moments_moment_type_check
  check (moment_type in ('new', 'practice', 'review', 'assignment'));
