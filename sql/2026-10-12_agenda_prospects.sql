-- ============================================================================
-- APEX APP — Agenda : rendez-vous prospect (12 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ajoute un 3ᵉ type de créneau, « prospect » : une personne reçue au studio
-- qui n'a pas de fiche client. On note son nom (obligatoire) et son
-- téléphone (facultatif). Un rendez-vous prospect n'est jamais facturé.
-- Le journal des suppressions recopie aussi le nom du prospect.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.agenda_creneaux add column if not exists prospect_nom text;
alter table public.agenda_creneaux add column if not exists prospect_tel text;

alter table public.agenda_creneaux drop constraint if exists agenda_creneaux_type_check;
alter table public.agenda_creneaux add constraint agenda_creneaux_type_check
  check (type in ('coaching', 'indispo', 'prospect'));

alter table public.agenda_creneaux drop constraint if exists agenda_creneaux_client_check;
alter table public.agenda_creneaux add constraint agenda_creneaux_client_check check (
  (type = 'coaching' and client_id is not null)
  or (type = 'indispo' and client_id is null)
  or (type = 'prospect' and client_id is null and coalesce(trim(prospect_nom), '') <> '')
);

-- Un prospect n'est jamais facturé « en plus »
alter table public.agenda_creneaux drop constraint if exists agenda_creneaux_prospect_en_plus_check;
alter table public.agenda_creneaux add constraint agenda_creneaux_prospect_en_plus_check
  check (type <> 'prospect' or en_plus = false);

-- Journal des suppressions : le nom du prospect remplace celui du client
create or replace function public.agenda_tracer_suppression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into agenda_suppressions
    (creneau_id, type, coach_id, client_id, client_nom, debut, fin,
     en_plus, notes, serie_id, supprime_par)
  values
    (old.id, old.type, old.coach_id, old.client_id,
     coalesce(
       (select trim(coalesce(prenom, '') || ' ' || coalesce(nom, ''))
        from profiles where id = old.client_id),
       old.prospect_nom),
     old.debut, old.fin, old.en_plus, old.notes, old.serie_id, auth.uid());
  return old;
end;
$$;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les deux colonnes prospect_nom et prospect_tel, et les contraintes.
select 'colonne' as quoi, column_name::text as detail
from information_schema.columns
where table_schema = 'public' and table_name = 'agenda_creneaux' and column_name like 'prospect%'
union all
select 'contrainte', conname || ' : ' || pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.agenda_creneaux'::regclass and contype = 'c'
order by 1, 2;
