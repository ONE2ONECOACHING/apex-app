-- ============================================================================
-- APEX APP — Messagerie : deux conversations pour les clients studio + suivi
-- (13 octobre 2026). À coller dans Supabase → SQL Editor → Run.
--
-- Avant : un client écrivait dans une seule conversation (« equipe » s'il est
-- studio sans suivi, « suivi » sinon).
-- Maintenant :
--   studio   (studio sans suivi) : « equipe » seulement (inchangé)
--   suivi    (studio + suivi)    : « suivi » (son coach référent) ET « equipe »
--                                  (toute l'équipe, ex. prévenir d'un retard)
--   distance (suivi à distance)  : « suivi » seulement (inchangé)
-- Les droits des coachs ne changent pas. Les photos et vocaux suivent les mêmes
-- règles (le stockage utilise la même fonction).
--
-- Ne modifie aucune donnée. Transaction, relançable sans risque.
-- ============================================================================

begin;

create or replace function public.peut_ecrire_conversation(p_client uuid, p_canal text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (auth.uid() = p_client and exists (
            select 1 from public.profiles
            where id = p_client
              and case type_client
                    when 'studio' then p_canal = 'equipe'
                    when 'suivi'  then p_canal in ('suivi', 'equipe')
                    else p_canal = 'suivi'
                  end))
      or (p_canal = 'suivi'  and public.est_referent(p_client))
      or (p_canal = 'equipe' and public.is_coach());
$$;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la définition contient « when 'suivi'  then p_canal in ('suivi', 'equipe') ».
select position('in (''suivi'', ''equipe'')' in pg_get_functiondef('public.peut_ecrire_conversation(uuid, text)'::regprocedure)) > 0
       as deux_canaux_pour_studio_suivi;
