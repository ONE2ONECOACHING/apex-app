-- ============================================================================
-- APEX APP — Agenda : créneau « formation » (30 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ajoute un 4ᵉ type de créneau, « formation » : une formation de l'équipe.
-- Un seul créneau dans la base, affiché dans le planning de tous les coachs
-- (le coach enregistré est celui qui l'a créé). Pas de client, jamais facturé.
-- Les droits ne changent pas : tous les coachs lisent et modifient l'agenda.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.agenda_creneaux drop constraint if exists agenda_creneaux_type_check;
alter table public.agenda_creneaux add constraint agenda_creneaux_type_check
  check (type in ('coaching', 'indispo', 'prospect', 'formation'));

alter table public.agenda_creneaux drop constraint if exists agenda_creneaux_client_check;
alter table public.agenda_creneaux add constraint agenda_creneaux_client_check check (
  (type = 'coaching' and client_id is not null)
  or (type in ('indispo', 'formation') and client_id is null)
  or (type = 'prospect' and client_id is null and coalesce(trim(prospect_nom), '') <> '')
);

-- Ni un prospect ni une formation ne sont facturés « en plus »
alter table public.agenda_creneaux drop constraint if exists agenda_creneaux_prospect_en_plus_check;
alter table public.agenda_creneaux add constraint agenda_creneaux_prospect_en_plus_check
  check (type not in ('prospect', 'formation') or en_plus = false);

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les trois contraintes, avec « formation » dans chacune.
select conname::text as contrainte, pg_get_constraintdef(oid) as regle
from pg_constraint
where conrelid = 'public.agenda_creneaux'::regclass
  and conname in ('agenda_creneaux_type_check', 'agenda_creneaux_client_check', 'agenda_creneaux_prospect_en_plus_check')
order by 1;
