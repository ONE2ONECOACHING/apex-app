-- ============================================================================
-- APEX APP — Agenda : récurrences sans date de fin (19 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Un rendez-vous « Répéter » n'a plus de date de fin : il revient toutes les
-- 1, 2, 3 ou 4 semaines tant que la série n'est pas arrêtée. La base garde
-- toujours environ 6 mois de séances d'avance : à chaque ouverture de l'agenda,
-- la fonction prolonger_series() ajoute les séances qui manquent.
-- « Supprimer ce créneau et les suivants » arrête la série.
--
--   1. Table agenda_series : une ligne par série sans fin (rythme, active ou non).
--   2. Une même série ne peut pas avoir deux séances à la même heure (protège
--      des doublons si deux coachs ouvrent l'agenda en même temps).
--   3. Fonction prolonger_series() : complète les séries actives jusqu'à
--      6 mois, à l'heure française (l'heure d'été est respectée).
--
-- Les séries déjà créées avec une date de fin ne changent pas.
-- Droits : tous les coachs (comme l'agenda). Ne modifie aucune donnée.
-- Transaction, relançable sans risque.
-- ============================================================================

begin;

create table if not exists public.agenda_series (
  id            uuid primary key,                       -- = agenda_creneaux.serie_id
  intervalle    integer not null default 1 check (intervalle between 1 and 4),
  active        boolean not null default true,
  cree_par      uuid references public.profiles(id) on delete set null default auth.uid(),
  cree_le       timestamptz not null default now()
);

alter table public.agenda_series enable row level security;

drop policy if exists agenda_series_coach_all on public.agenda_series;
create policy agenda_series_coach_all on public.agenda_series
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

-- Pas deux séances d'une même série au même moment (seulement si l'existant le permet)
do $$
begin
  if not exists (
    select 1 from public.agenda_creneaux where serie_id is not null
    group by serie_id, debut having count(*) > 1
  ) then
    create unique index if not exists agenda_creneaux_serie_debut_uniq
      on public.agenda_creneaux (serie_id, debut) where serie_id is not null;
  end if;
end;
$$;

-- Complète les séries actives jusqu'à « p_semaines » semaines d'avance
create or replace function public.prolonger_series(p_semaines integer default 26)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  s record;
  modele record;
  limite timestamptz := now() + make_interval(weeks => p_semaines);
  prochain timestamp;   -- heure française, sans fuseau
  duree interval;
  ajoutes integer := 0;
  n integer;
begin
  if not public.is_coach() then return 0; end if;
  for s in select * from public.agenda_series where active loop
    select * into modele from public.agenda_creneaux
      where serie_id = s.id order by debut desc limit 1;
    if not found then
      update public.agenda_series set active = false where id = s.id;
      continue;
    end if;
    duree := modele.fin - modele.debut;
    prochain := (modele.debut at time zone 'Europe/Paris') + make_interval(weeks => s.intervalle);
    while (prochain at time zone 'Europe/Paris') <= limite loop
      insert into public.agenda_creneaux
        (type, coach_id, client_id, debut, fin, journee_entiere, en_plus, notes,
         serie_id, prospect_nom, prospect_tel)
      values
        (modele.type, modele.coach_id, modele.client_id,
         prochain at time zone 'Europe/Paris', (prochain at time zone 'Europe/Paris') + duree,
         modele.journee_entiere, modele.en_plus, modele.notes,
         s.id, modele.prospect_nom, modele.prospect_tel)
      on conflict do nothing;
      get diagnostics n = row_count;
      ajoutes := ajoutes + n;
      prochain := prochain + make_interval(weeks => s.intervalle);
    end loop;
  end loop;
  return ajoutes;
end;
$$;

revoke all on function public.prolonger_series(integer) from public, anon;
grant execute on function public.prolonger_series(integer) to authenticated;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : table « RLS active », sa règle, la fonction, et l'index anti-doublons.
select 'table' as quoi,
       c.relname::text || case when c.relrowsecurity then ' : RLS active' else ' : RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'agenda_series'
union all
select 'regle', policyname || ' | ' || cmd from pg_policies where tablename = 'agenda_series'
union all
select 'fonction', proname::text from pg_proc where proname = 'prolonger_series'
union all
select 'index anti-doublons', coalesce((select indexname::text from pg_indexes where indexname = 'agenda_creneaux_serie_debut_uniq'), 'ABSENT : doublons existants, à me signaler');
