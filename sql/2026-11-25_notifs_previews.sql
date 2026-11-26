-- ============================================================================
-- APEX APP — Notifications en double à cause des previews (25 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Chaque preview Cloudflare (une adresse par branche) ouverte un jour par un
-- gérant a créé son propre abonnement aux notifications : une même
-- notification arrive donc une fois par preview. La base ne sait pas de
-- quelle adresse vient un abonnement : on efface tous ceux des gérants.
-- Ils se recréent tout seuls à la prochaine ouverture de l'app officielle
-- (app.one2onecoaching.fr), et l'app ne s'abonne plus jamais depuis une
-- preview (js/push.js).
--
-- Ne touche ni aux clients ni aux autres coachs. Relançable sans risque.
-- ============================================================================

begin;

delete from public.push_subscriptions
where profile_id in (select id from public.profiles where is_gerant);

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 0 juste après. Puis 1 par appareil (ordinateur, téléphone) une
-- fois l'app officielle rouverte sur chacun.
select p.prenom, count(s.*) as abonnements
from public.profiles p
left join public.push_subscriptions s on s.profile_id = p.id
where p.is_gerant
group by p.prenom
order by p.prenom;
