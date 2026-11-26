-- ============================================================================
-- APEX APP — Remettre un client en « Pas encore défini » (28 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Erreur vue par Benjamin : repasser le mode de facturation d'un client à
-- « — Pas encore défini — » échouait (« null value in column facturation_mixte »).
-- Cause : la fonction qui recopie le mode dans facturation_mixte (19 octobre
-- 2026) calculait « vide = mixte », ce qui donne « inconnu » au lieu de « non ».
-- Correction : un mode vide donne facturation_mixte = false.
--
-- Ce que ça ne change pas : aucune donnée, aucune règle.
-- Transaction, relançable sans risque.
-- ============================================================================

begin;

create or replace function public.profiles_sync_facturation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mode_facturation is distinct from old.mode_facturation then
    new.facturation_mixte := coalesce(new.mode_facturation = 'mixte', false);
  end if;
  return new;
end;
$$;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : « corrigée » (la fonction contient bien le coalesce).
select case when pg_get_functiondef('public.profiles_sync_facturation'::regproc) like '%coalesce%'
            then 'corrigée' else 'PAS corrigée' end as fonction_profiles_sync_facturation;
