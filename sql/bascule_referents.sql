-- ============================================================================
-- APEX APP — Jour de bascule : chaque client reçoit son vrai coach référent
-- À lancer LE JOUR OÙ toute l'équipe travaille avec ses propres comptes.
-- (Renommer le fichier avec la date du jour au moment de l'exécution.)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ce que ça fait :
--   1. Répartit les clients d'après leur étiquette :
--        ben   → le compte coach dont le prénom est « Benjamin »
--        chris → le compte coach dont le prénom est « Christophe »
--        lola  → le compte coach dont le prénom est « Lola »
--      Les clients sans étiquette restent au compte partagé : à attribuer
--      ensuite à la main, sur leur fiche (menu « Coach référent »).
--   2. Les nouveaux clients ne reçoivent plus le compte partagé comme
--      référent par défaut : c'est le coach qui les crée qui le devient.
--
-- Conséquence : le compte partagé ne peut plus modifier le plan, les bilans
-- ni les mesures des clients répartis. Chacun doit utiliser son compte.
--
-- Le script s'arrête sans rien changer si un des trois comptes est absent
-- ou en double. Tout est dans une transaction. Relançable sans risque.
-- ============================================================================

begin;

do $$
declare
  v_prenom text;
begin
  foreach v_prenom in array array['Benjamin', 'Christophe', 'Lola'] loop
    if (select count(*) from public.profiles
        where role = 'coach' and lower(prenom) = lower(v_prenom)) <> 1 then
      raise exception 'Il faut exactement un compte coach au prénom « % » (voir l''écran Équipe).', v_prenom;
    end if;
  end loop;
end;
$$;

update public.profiles c
set coach_referent_id = co.id
from public.profiles co
where c.role = 'client'
  and co.role = 'coach'
  and lower(co.prenom) = case c.coach_tag
                           when 'ben'   then 'benjamin'
                           when 'chris' then 'christophe'
                           when 'lola'  then 'lola'
                         end;

-- Nouveaux comptes : plus de référent par défaut
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, prenom, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'prenom', 'Client'),
    'client'
  );
  return new;
end;
$$;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Nombre de clients par référent, avec leur étiquette.
select coalesce(trim(co.prenom || ' ' || coalesce(co.nom, '')), '(aucun)') as referent,
       coalesce(nullif(c.coach_tag, ''), '(aucune)') as etiquette,
       count(*) as clients
from public.profiles c
left join public.profiles co on co.id = c.coach_referent_id
where c.role = 'client'
group by 1, 2
order by 1, 2;
