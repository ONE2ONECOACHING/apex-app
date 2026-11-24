-- ============================================================================
-- APEX APP — Réservation en ligne du bilan offert (24 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Une page publique (bilan.html) permet à un prospect de réserver lui-même son
-- « bilan + séance d'essai » (1 h) avec Benjamin ou Christophe (les gérants).
-- Choix de Benjamin :
--   • créneaux à l'heure et à la demi-heure, 8 h - 20 h du lundi au vendredi,
--     8 h - 12 h le samedi, de demain à J+7 (heure de Paris) ;
--   • libre = au moins un gérant sans coaching, RDV prospect ni indisponibilité
--     sur l'heure ; une formation bloque tout le monde ;
--   • si les deux sont libres : celui qui a le moins de RDV prospects dans la
--     semaine (au hasard à égalité).
-- La réservation crée le créneau prospect dans l'agenda et met le lead en
-- « RDV studio » (lead retrouvé par son téléphone ou son email, sinon créé).
--
-- Sécurité : les deux fonctions ne sont appelables que par l'Edge Function
-- reservation-bilan (clé de service). Ni les visiteurs, ni les comptes connectés
-- ne peuvent les appeler directement, et la page ne voit que des horaires libres.
--
-- Ajoute aussi leads.rdv_rappele_le (rappel WhatsApp du RDV envoyé depuis le CRM).
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.leads add column if not exists rdv_rappele_le timestamptz;

-- ── Un gérant est-il libre sur [debut, debut + 1 h] ? ───────────────────────
create or replace function public.gerant_libre_bilan(p_gerant uuid, p_debut timestamptz)
returns boolean
language sql
stable
set search_path = public
as $$
  select not exists (
    select 1 from public.agenda_creneaux c
    where c.debut < p_debut + interval '1 hour' and c.fin > p_debut
      and (c.type = 'formation'
           or (c.coach_id = p_gerant and c.type in ('coaching', 'prospect', 'indispo')))
  );
$$;

-- ── Créneaux proposés sur la page ───────────────────────────────────────────
create or replace function public.creneaux_bilan_libres()
returns table (debut timestamptz)
language sql
stable
set search_path = public
as $$
  with jours as (
    select j::date as jour
    from generate_series((now() at time zone 'Europe/Paris')::date + 1,
                         (now() at time zone 'Europe/Paris')::date + 7,
                         interval '1 day') j
  ),
  debuts as (
    select ((j.jour + make_interval(mins => m)) at time zone 'Europe/Paris') as debut
    from jours j
    cross join generate_series(8 * 60, 19 * 60, 30) m          -- 8:00 … 19:00 (fin 20:00)
    where extract(isodow from j.jour) between 1 and 5
       or (extract(isodow from j.jour) = 6 and m <= 11 * 60)    -- samedi : 8:00 … 11:00
  )
  select d.debut
  from debuts d
  where exists (
    select 1 from public.profiles g
    where g.role = 'coach' and g.is_gerant and public.gerant_libre_bilan(g.id, d.debut)
  )
  order by d.debut;
$$;

-- ── Réservation (revérifiée sous verrou : pas deux RDV sur le même trou) ────
create or replace function public.reserver_bilan(
  p_debut timestamptz, p_prenom text, p_nom text, p_telephone text, p_email text, p_source text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_prenom text := nullif(left(trim(coalesce(p_prenom, '')), 80), '');
  v_nom    text := nullif(left(trim(coalesce(p_nom, '')), 80), '');
  v_tel    text := nullif(left(trim(coalesce(p_telephone, '')), 30), '');
  v_email  text := nullif(lower(left(trim(coalesce(p_email, '')), 120)), '');
  v_source text := case when p_source in ('meta', 'instagram', 'autre') then p_source else 'meta' end;
  v_chiffres text := right(regexp_replace(coalesce(p_telephone, ''), '\D', '', 'g'), 9);
  v_coach  uuid;
  v_creneau uuid;
  v_lead   public.leads%rowtype;
  v_qui    text;
  v_trace  jsonb;
  v_nouveau boolean := false;
begin
  if v_prenom is null or v_tel is null or length(v_chiffres) < 9 then
    return jsonb_build_object('erreur', 'champs');
  end if;

  perform pg_advisory_xact_lock(hashtext('reservation_bilan'));

  if not exists (select 1 from public.creneaux_bilan_libres() c where c.debut = p_debut) then
    return jsonb_build_object('erreur', 'pris');
  end if;

  -- Lead déjà connu (même téléphone ou même email), le plus récent
  select * into v_lead from public.leads l
  where (length(v_chiffres) = 9 and right(regexp_replace(coalesce(l.telephone, ''), '\D', '', 'g'), 9) = v_chiffres)
     or (v_email is not null and lower(l.email) = v_email)
  order by l.cree_le desc
  limit 1;

  if v_lead.id is not null and v_lead.etape = 'rdv' and v_lead.rdv_le > now() then
    return jsonb_build_object('erreur', 'deja', 'rdv_le', v_lead.rdv_le);
  end if;

  -- Gérant libre le moins chargé dans la semaine
  select g.id into v_coach
  from public.profiles g
  where g.role = 'coach' and g.is_gerant and public.gerant_libre_bilan(g.id, p_debut)
  order by (select count(*) from public.agenda_creneaux c
            where c.coach_id = g.id and c.type = 'prospect'
              and date_trunc('week', c.debut at time zone 'Europe/Paris')
                = date_trunc('week', p_debut at time zone 'Europe/Paris')),
           random()
  limit 1;
  if v_coach is null then
    return jsonb_build_object('erreur', 'pris');
  end if;

  v_qui := coalesce(v_prenom || ' ' || v_nom, v_prenom);
  insert into public.agenda_creneaux (type, coach_id, debut, fin, prospect_nom, prospect_tel, notes)
  values ('prospect', v_coach, p_debut, p_debut + interval '1 hour', v_qui, v_tel,
          'Bilan + séance d''essai réservé en ligne')
  returning id into v_creneau;

  v_trace := jsonb_build_object('quand', now(), 'qui', 'Page de réservation',
    'quoi', 'Bilan réservé en ligne pour le '
      || to_char(p_debut at time zone 'Europe/Paris', 'DD/MM à HH24:MI'));

  if v_lead.id is not null then
    update public.leads set
      etape = 'rdv', rdv_le = p_debut, rdv_creneau_id = v_creneau, rdv_rappele_le = null,
      responsable_id = coalesce(responsable_id, v_coach),
      rappel_le = null, clos_le = null,
      setting_le = coalesce(setting_le, now()),
      prenom = coalesce(prenom, v_prenom), nom = coalesce(nom, v_nom),
      telephone = coalesce(telephone, v_tel), email = coalesce(email, v_email),
      historique = historique || jsonb_build_array(v_trace)
    where id = v_lead.id;
  else
    insert into public.leads (source, prenom, nom, telephone, email, etape, responsable_id,
                              setting_le, rdv_le, rdv_creneau_id, prochaine_le, historique)
    values (v_source, v_prenom, v_nom, v_tel, v_email, 'rdv', v_coach,
            now(), p_debut, v_creneau, null, jsonb_build_array(v_trace))
    returning * into v_lead;
    v_nouveau := true;
  end if;

  return jsonb_build_object('ok', true, 'lead_id', v_lead.id, 'coach_id', v_coach,
                            'debut', p_debut, 'nouveau', v_nouveau);
end;
$$;

-- Réservées à l'Edge Function (clé de service)
revoke all on function public.gerant_libre_bilan(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.creneaux_bilan_libres() from public, anon, authenticated;
revoke all on function public.reserver_bilan(timestamptz, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.gerant_libre_bilan(uuid, timestamptz) to service_role;
grant execute on function public.creneaux_bilan_libres() to service_role;
grant execute on function public.reserver_bilan(timestamptz, text, text, text, text, text) to service_role;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la colonne rdv_rappele_le, les trois fonctions sans droit pour
-- anon / authenticated, et le nombre de créneaux libres des 7 prochains jours.
select 'colonne' as quoi, column_name::text as detail
from information_schema.columns
where table_schema = 'public' and table_name = 'leads' and column_name = 'rdv_rappele_le'
union all
select 'fonction', p.proname || ' | anon : ' || has_function_privilege('anon', p.oid, 'execute')::text
       || ' | connectés : ' || has_function_privilege('authenticated', p.oid, 'execute')::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('gerant_libre_bilan', 'creneaux_bilan_libres', 'reserver_bilan')
union all
select 'créneaux libres', count(*)::text from public.creneaux_bilan_libres()
order by 1, 2;
