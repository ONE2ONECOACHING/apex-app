-- ============================================================================
-- APEX APP — Test des droits (8 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run, APRÈS 2026-10-08_droits_coachs.sql.
--
-- NE MODIFIE RIEN : le test se termine volontairement par un message
-- d'« erreur » qui contient le rapport. Ce message annule tout ce que le test
-- a essayé d'écrire. Relançable autant de fois que voulu.
--
-- Le test se met tour à tour dans la peau de :
--   1. le compte coach partagé (référent de tous les clients),
--   2. le gérant,
--   3. un « autre coach » : le gérant privé de son statut, le temps du test,
--   4. un client.
-- Pour chacun : nombre de lignes visibles par table, puis trois écritures
-- sur un client test (modifier son plan, ajouter une note coach, modifier
-- ses infos). 1 = autorisé, 0 = refusé.
-- ============================================================================

do $$
declare
  v_partage uuid := 'fe2c19c2-e00f-4c4e-9543-3634022e42ff';
  v_gerant  uuid;
  v_client  uuid;
  v_plan    uuid;
  v_i       int := 0;
  v_n       int;
  v_t       text;
  v_rapport text := '';
  r         record;
  v_tables  text[] := array[
    'profiles', 'activites_sportives', 'plans_nutritionnels', 'plan_repas',
    'habitudes_config', 'habitudes_journal', 'journal_entries', 'mesures',
    'poids_journal', 'bilans_hebdo', 'bilan_instances', 'bilan_assignations',
    'coach_notes', 'client_programmes', 'prog_templates', 'formations'];
begin
  select id into v_gerant from public.profiles where is_gerant limit 1;
  select p.profile_id, p.id into v_client, v_plan
  from public.plans_nutritionnels p
  join public.profiles c on c.id = p.profile_id
  where c.role = 'client' and c.coach_referent_id = v_partage
  limit 1;

  if v_gerant is null or v_client is null then
    raise exception 'Test impossible : il faut un gérant et un client avec un plan.';
  end if;

  for r in
    select * from (values
      (1, 'COMPTE PARTAGÉ (référent)', v_partage, false),
      (2, 'GÉRANT',                    v_gerant,  false),
      (3, 'AUTRE COACH (simulé)',      v_gerant,  true),
      (4, 'CLIENT (lui-même)',         v_client,  false)
    ) as x(ordre, nom, uid, simuler_coach)
    order by ordre
  loop
    v_i := v_i + 1;
    if r.simuler_coach then
      update public.profiles set is_gerant = false where id = r.uid;
    end if;

    perform set_config('request.jwt.claims',
      json_build_object('sub', r.uid, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    v_rapport := v_rapport || E'\n\n== ' || r.nom || E'\n   lignes visibles : ';
    foreach v_t in array v_tables loop
      execute format('select count(*) from public.%I', v_t) into v_n;
      v_rapport := v_rapport || v_t || '=' || v_n || '  ';
    end loop;

    update public.plans_nutritionnels set notes = notes where id = v_plan;
    get diagnostics v_n = row_count;
    v_rapport := v_rapport || E'\n   modifier le plan : ' || v_n;

    begin
      insert into public.coach_notes (client_id, coach_id, semaine, note)
      values (v_client, r.uid, date '2099-01-05' + 7 * v_i, 'test');
      v_rapport := v_rapport || '   ajouter une note coach : 1';
    exception when others then
      v_rapport := v_rapport || '   ajouter une note coach : 0';
    end;

    update public.profiles set nom = nom where id = v_client;
    get diagnostics v_n = row_count;
    v_rapport := v_rapport || '   modifier les infos : ' || v_n;

    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    if r.simuler_coach then
      update public.profiles set is_gerant = true where id = r.uid;
    end if;
  end loop;

  raise exception E'RAPPORT DE TEST (ce n''est pas une vraie erreur, rien n''a été modifié) :%', v_rapport;
end;
$$;
