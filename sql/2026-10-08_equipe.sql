-- ============================================================================
-- APEX APP — Étape 1, lot 6 : écran Équipe (8 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ajoute la fonction transferer_coach(ancien, nouveau), appelée par l'Edge
-- Function manage-team avant de supprimer un coach. Elle donne au remplaçant :
--   - les clients dont l'ancien coach était le référent,
--   - tout ce que l'ancien coach avait créé ou envoyé : modèles de programmes,
--     modèles de bilans, formations, programmes attribués, bilans, notes.
-- Sans ce transfert, la base effacerait ses modèles avec son compte.
--
-- Seule l'Edge Function (service role) peut l'appeler : ni les clients ni
-- les coachs ne peuvent l'utiliser depuis l'app.
--
-- Ne modifie aucune donnée. Tout est dans une transaction. Relançable.
-- ============================================================================

begin;

create or replace function public.transferer_coach(p_ancien uuid, p_nouveau uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ancien = p_nouveau then
    raise exception 'Le remplaçant doit être un autre coach';
  end if;
  if not exists (select 1 from profiles where id = p_ancien and role = 'coach') then
    raise exception 'Coach à remplacer introuvable';
  end if;
  if not exists (select 1 from profiles where id = p_nouveau and role = 'coach') then
    raise exception 'Le remplaçant doit être un compte coach';
  end if;

  update profiles               set coach_referent_id = p_nouveau where coach_referent_id = p_ancien;
  update prog_templates         set coach_id = p_nouveau where coach_id = p_ancien;
  update bilan_templates        set coach_id = p_nouveau where coach_id = p_ancien;
  update formations             set coach_id = p_nouveau where coach_id = p_ancien;
  update client_programmes      set coach_id = p_nouveau where coach_id = p_ancien;
  update bilan_assignations     set coach_id = p_nouveau where coach_id = p_ancien;
  update bilan_instances        set coach_id = p_nouveau where coach_id = p_ancien;
  update formation_assignations set coach_id = p_nouveau where coach_id = p_ancien;
  update coach_notes            set coach_id = p_nouveau where coach_id = p_ancien;
end;
$$;

revoke all on function public.transferer_coach(uuid, uuid) from public, anon, authenticated;
grant execute on function public.transferer_coach(uuid, uuid) to service_role;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : une ligne, peut_appeler_connecte = false, peut_appeler_service = true.
select 'transferer_coach' as fonction,
       has_function_privilege('authenticated', 'public.transferer_coach(uuid, uuid)', 'execute') as peut_appeler_connecte,
       has_function_privilege('service_role',  'public.transferer_coach(uuid, uuid)', 'execute') as peut_appeler_service;
