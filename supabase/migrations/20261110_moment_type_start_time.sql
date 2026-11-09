-- Optionele velden voor nieuwe leermomenten. Bestaande leermomenten houden een lege waarde
-- en vallen in de analyses onder 'Niet gecategoriseerd' of 'onbekend tijdstip'.
alter table public.learning_moments
  add column if not exists moment_type text check (moment_type in ('new', 'practice', 'review'));

alter table public.learning_moments
  add column if not exists start_time time;
