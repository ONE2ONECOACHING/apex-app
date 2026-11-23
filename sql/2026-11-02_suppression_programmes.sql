-- ============================================================================
-- APEX APP — Pouvoir supprimer un programme archivé (2 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Erreur vue par Benjamin : « des séances faites par le client y sont encore
-- rattachées ». Cause : d'anciens liens de la base (tables créées à la main,
-- ex. seances_log) interdisent de supprimer un programme, une séance ou un
-- exercice de programme tant qu'une séance faite par le client y renvoie.
--
-- Correction : ces liens passent en « on delete set null ». Quand un programme
-- est supprimé, les séances faites par le client restent dans son historique
-- (nom de la séance, date, charges), seulement détachées du programme.
-- Seuls les liens qui bloquent sont modifiés ; ceux qui effacent déjà en
-- cascade (grille du studio, séance en cours…) ne bougent pas.
--
-- Ne modifie aucune donnée. Transaction, relançable sans risque.
-- ============================================================================

begin;

do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, a.attname as col,
           c.confrelid::regclass as ref, af.attname as refcol, a.attnotnull
    from pg_constraint c
    join pg_attribute a  on a.attrelid  = c.conrelid  and a.attnum  = c.conkey[1]
    join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
    where c.contype = 'f'
      and c.confrelid in ('public.client_programmes'::regclass,
                          'public.client_prog_seances'::regclass,
                          'public.client_prog_exercices'::regclass)
      and c.confdeltype in ('a', 'r')          -- aucune action / restrict = bloque
      and array_length(c.conkey, 1) = 1
  loop
    if r.attnotnull then
      raise notice 'Laissé tel quel (colonne obligatoire) : %.%', r.tbl, r.col;
      continue;
    end if;
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references %s(%I) on delete set null',
                   r.tbl, r.conname, r.col, r.ref, r.refcol);
    raise notice 'Corrigé : %.% → %', r.tbl, r.col, r.ref;
  end loop;
end $$;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : plus aucune ligne « BLOQUE ». Les autres liens sont en
-- « efface avec » (cascade) ou « détache » (set null).
select c.conrelid::regclass::text as table_liee, a.attname::text as colonne,
       c.confrelid::regclass::text as vers,
       case c.confdeltype when 'c' then 'efface avec' when 'n' then 'détache'
                          when 'a' then 'BLOQUE' when 'r' then 'BLOQUE' else c.confdeltype::text end as a_la_suppression
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
where c.contype = 'f'
  and c.confrelid in ('public.client_programmes'::regclass,
                      'public.client_prog_seances'::regclass,
                      'public.client_prog_exercices'::regclass)
order by 4, 1, 2;
