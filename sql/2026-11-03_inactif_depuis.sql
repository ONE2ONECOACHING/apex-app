-- ============================================================================
-- APEX APP — Date « inactif depuis » des clients (3 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Pour le tableau de bord des gérants (clients perdus du mois) : la date où
-- un client passe en inactif est notée automatiquement par le serveur.
--   - passage en inactif → inactif_depuis = maintenant ;
--   - retour en actif    → inactif_depuis vidé ;
--   - sinon la date ne bouge pas (personne ne peut l'écrire à la main).
-- Les clients déjà inactifs n'ont pas de date (inconnue) : ils ne comptent
-- dans aucun mois.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.profiles add column if not exists inactif_depuis timestamptz;

create or replace function public.profiles_inactif_depuis()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.inactif_depuis := case when new.actif = false then now() end;
  elsif new.actif is distinct from old.actif then
    new.inactif_depuis := case when new.actif = false then now() end;
  else
    new.inactif_depuis := old.inactif_depuis;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_inactif_depuis on public.profiles;
create trigger profiles_inactif_depuis before insert or update on public.profiles
  for each row execute function public.profiles_inactif_depuis();

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la colonne inactif_depuis et le trigger profiles_inactif_depuis.
select 'colonne' as quoi, column_name::text || ' : ' || data_type as detail
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'inactif_depuis'
union all
select 'trigger', tgname::text
from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_inactif_depuis';
