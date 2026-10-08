-- ============================================================================
-- APEX APP — Étape 1, lot 5 (suite) : droits sur les photos de mesures
-- À coller dans Supabase → SQL Editor → Run.
--
-- Les photos de mesures (stockage « mesures », un dossier par client) suivent
-- la même règle que les mesures : le coach référent et les gérants les voient,
-- les autres coachs non. Avant : tout compte coach.
--
-- Ce que ça ne change pas : les règles des clients sur leurs propres photos,
-- et le compte coach partagé (référent de tous les clients).
--
-- Tout est dans une transaction. Relançable sans risque.
-- ============================================================================

begin;

drop policy if exists coaches_read_client_mesure_photos on storage.objects;
create policy coaches_read_client_mesure_photos on storage.objects
  for select to authenticated
  using (
    bucket_id = 'mesures'
    and (
      public.is_gerant()
      or exists (
        select 1 from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and p.coach_referent_id = auth.uid()
      )
    )
  );

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
select policyname, cmd, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
