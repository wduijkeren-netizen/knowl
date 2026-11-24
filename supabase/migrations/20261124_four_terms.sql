-- Er zijn vier trimesters per schooljaar mogelijk.
alter table public.school_terms drop constraint if exists school_terms_term_check;
alter table public.school_terms add constraint school_terms_term_check check (term between 1 and 4);
