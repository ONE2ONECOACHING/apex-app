// APEX APP — Coach : fiches clients sur ordinateur
// 1. Onglets de fiches ouvertes, comme dans Safari : chaque fiche client ouverte
//    s'ajoute en haut ; on passe d'un client à l'autre sans perdre la page où
//    l'on était. Mémorisés dans le navigateur du coach.
// 2. Colonne « résumé » à gauche, toujours visible sur une fiche : prochain
//    coaching, programme, nutrition, dernier bilan, journal de suivi, profil.
// Affichés seulement sur grand écran (CSS) ; le téléphone garde la fiche actuelle.

// Écrans qui font partie d'une fiche client
const ECRANS_FICHE = ['coach-client-edit', 'coach-client-programme', 'coach-training-client', 'coach-plan-edit',
  'coach-calcul-nutrition', 'coach-habits-edit', 'coach-journal-suivi', 'coach-journal', 'coach-journal-view',
  'coach-bilan-client', 'coach-mesure-client', 'coach-client-messages', 'coach-client-suivi',
  'coach-seance-studio', 'coach-programme-archive', 'coach-cardio-plan', 'coach-client-notifs'];

const FicheOnglets = {
  _cle() { return 'ficheOnglets_' + (Router.userProfile?.id || ''); },

  lire() {
    try { return JSON.parse(localStorage.getItem(this._cle()) || '[]'); } catch (_) { return []; }
  },

  ecrire(liste) {
    try { localStorage.setItem(this._cle(), JSON.stringify(liste.slice(-20))); } catch (_) {}
  },

  // Page de fiche affichée : l'onglet du client est créé ou mis à jour
  noter(clientId, page, params) {
    const liste = this.lire();
    const o = liste.find(x => x.id === clientId);
    if (o) { o.page = page; o.params = params; }
    else liste.push({ id: clientId, nom: '', page, params });
    this.ecrire(liste);
  },

  nommer(clientId, nom) {
    if (!nom) return;
    const liste = this.lire();
    const o = liste.find(x => x.id === clientId);
    if (o && o.nom !== nom) { o.nom = nom; this.ecrire(liste); this.afficher(Router.getParams().clientId); }
  },

  // Ouvre plusieurs fiches d'un coup (coachings du jour) et affiche la première
  ouvrirPlusieurs(clients) {
    if (!clients.length) return;
    const liste = this.lire();
    for (const c of clients) {
      // Fiches du jour : ouvertes sur l'onglet Entraînement (programme renfo ou plan cardio)
      if (!liste.some(x => x.id === c.id)) liste.push({ id: c.id, nom: c.nom || '', page: 'coach-client-programme', params: {} });
    }
    this.ecrire(liste);
    this.aller(clients[0].id);
  },

  aller(clientId) {
    if (this._glisse) return;   // fin d'un glisser-déposer, pas un clic
    const o = this.lire().find(x => x.id === clientId);
    if (o) Router.navigate(o.page, { ...(o.params || {}), clientId });
  },

  // Client supprimé : son onglet disparaît sans rien ouvrir
  retirer(clientId) {
    this.ecrire(this.lire().filter(x => x.id !== clientId));
  },

  fermer(clientId, actif) {
    const liste = this.lire();
    const i = liste.findIndex(x => x.id === clientId);
    if (i < 0) return;
    liste.splice(i, 1);
    this.ecrire(liste);
    if (actif) {
      const voisin = liste[i] || liste[i - 1];
      if (voisin) this.aller(voisin.id); else window.location.hash = '#coach-clients';
    } else this.afficher(Router.getParams().clientId);
  },

  afficher(actifId) {
    const barre = document.getElementById('ficheOnglets');
    if (!barre) return;
    const liste = this.lire();
    barre.innerHTML = `
      ${liste.map(o => `
        <div class="fo-onglet ${o.id === actifId ? 'on' : ''}" data-onglet="${o.id}" title="${escHtml(o.nom)}"
          onclick="FicheOnglets.aller('${o.id}')" onpointerdown="FicheOnglets._ddDebut(event,'${o.id}')">
          <span class="fo-nom">${escHtml(o.nom || '…')}</span>
          <button class="fo-fermer" aria-label="Fermer" onclick="event.stopPropagation();FicheOnglets.fermer('${o.id}', ${o.id === actifId})">×</button>
        </div>`).join('')}
      <div class="fo-plus-zone">
        <button class="fo-plus" aria-label="Ouvrir un client" onclick="FicheOnglets.chercher()">+</button>
        <div class="fo-recherche" id="foRecherche" hidden>
          <input class="input" id="foChamp" type="search" placeholder="Ouvrir un client…" autocomplete="off"
            oninput="FicheOnglets._resultats(this.value)" onkeydown="if(event.key==='Escape')FicheOnglets.chercher(false)">
          <div id="foResultats"></div>
        </div>
      </div>`;
  },

  // Glisser un onglet pour changer l'ordre (au-delà de 5 px : sinon c'est un clic)
  _ddDebut(e, id) {
    if (e.button !== 0 || e.target.closest('.fo-fermer')) return;
    const el = e.currentTarget;
    const onglets = [...document.querySelectorAll('[data-onglet]')];
    const i = onglets.indexOf(el);
    const rects = onglets.map(o => o.getBoundingClientRect());
    // Place libérée par l'onglet tenu : sa largeur + l'écart entre deux onglets
    const ecart = rects.length > 1 ? Math.max(0, rects[1].left - rects[0].right) : 0;
    const largeur = rects[i].width + ecart;
    const d = { id, el, x0: e.clientX, actif: false, j: i };
    const bouge = ev => {
      const dx = ev.clientX - d.x0;
      if (!d.actif && Math.abs(dx) < 5) return;
      d.actif = true;
      el.classList.add('fo-glisse');
      el.style.transform = `translateX(${dx}px)`;
      // Nouvelle place = nombre d'autres onglets dont le milieu est avant celui de l'onglet tenu ;
      // les autres se poussent en direct pour la montrer
      const milieu = rects[i].left + rects[i].width / 2 + dx;
      d.j = rects.filter((r, k) => k !== i && r.left + r.width / 2 < milieu).length;
      onglets.forEach((o, k) => {
        if (k === i) return;
        const decal = i < d.j && k > i && k <= d.j ? -largeur : d.j < i && k >= d.j && k < i ? largeur : 0;
        o.style.transform = decal ? `translateX(${decal}px)` : '';
      });
    };
    const fin = ev => {
      document.removeEventListener('pointermove', bouge);
      document.removeEventListener('pointerup', fin);
      document.removeEventListener('pointercancel', fin);
      if (!d.actif) return;
      this._glisse = true;
      setTimeout(() => { this._glisse = false; }, 0);
      if (ev.type !== 'pointercancel' && d.j !== i) {
        const liste = this.lire();
        const k = liste.findIndex(x => x.id === id);
        const [o] = liste.splice(k, 1);
        liste.splice(d.j, 0, o);
        this.ecrire(liste);
      }
      this.afficher(Router.getParams().clientId);
    };
    document.addEventListener('pointermove', bouge);
    document.addEventListener('pointerup', fin);
    document.addEventListener('pointercancel', fin);
  },

  async chercher(ouvrir = true) {
    const zone = document.getElementById('foRecherche');
    if (!zone) return;
    zone.hidden = !ouvrir || !zone.hidden;
    if (zone.hidden) return;
    const champ = document.getElementById('foChamp');
    champ.value = ''; champ.focus();
    document.getElementById('foResultats').innerHTML = '';
    // Liste relue à chaque ouverture (nouveaux clients, changements de nom)
    this._clients = await db.getClientsAgenda().catch(() => this._clients || []);
    // Fermer en cliquant ailleurs
    setTimeout(() => document.addEventListener('click', this._dehors = e => {
      if (!e.target.closest('.fo-plus-zone')) { zone.hidden = true; document.removeEventListener('click', this._dehors); }
    }), 0);
  },

  _resultats(q) {
    const s = q.trim().toLowerCase();
    const res = s ? (this._clients || []).filter(c => `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().includes(s)).slice(0, 8) : [];
    document.getElementById('foResultats').innerHTML = res.map(c => `
      <div class="fo-resultat" onclick="Router.navigate('coach-client-edit',{clientId:'${c.id}'})">${escHtml(`${c.prenom || ''} ${c.nom || ''}`.trim())}</div>`).join('');
  },
};

const FicheResume = {
  _cache: new Map(),   // clientId → { le, html, nom }

  // Affiche tout de suite la dernière version connue, puis la relit (au plus toutes les 10 s)
  async afficher(clientId, forcer = false) {
    const el = document.getElementById('ficheResumeCorps');
    if (!el) return;
    const c = this._cache.get(clientId);
    if (c) { el.innerHTML = c.html; FicheOnglets.nommer(clientId, c.nom); }
    else el.innerHTML = '<div class="spinner" style="margin:2rem auto;"></div>';
    if (c && !forcer && Date.now() - c.le < 10000) return;
    let nom = c?.nom || '';
    let introuvable = false;
    const html = await this._construire(clientId, n => { nom = n; })
      .catch(e => {
        introuvable = e?.code === 'PGRST116';   // aucune fiche : client supprimé
        return `<div class="fr-vide">${escHtml(e.message)}</div>`;
      });
    if (introuvable) {
      this._cache.delete(clientId);
      toast("Cette fiche n'existe plus : son onglet est fermé.", 'info');
      FicheOnglets.fermer(clientId, Router.getParams().clientId === clientId);
      return;
    }
    this._cache.set(clientId, { le: Date.now(), html, nom });
    if (Router.getParams().clientId === clientId && document.getElementById('ficheResumeCorps')) {
      document.getElementById('ficheResumeCorps').innerHTML = html;
    }
  },

  // Flèche ‹ / › : masquer ou sortir le résumé (choix mémorisé dans ce navigateur)
  _replie() {
    try { return localStorage.getItem('ficheResumeReplie') === '1'; } catch (_) { return false; }
  },

  replier(replie = !this._replie()) {
    try { localStorage.setItem('ficheResumeReplie', replie ? '1' : '0'); } catch (_) {}
    document.body.classList.toggle('resume-replie', replie);
    const btn = document.querySelector('#ficheResume .fr-replier');
    if (btn) {
      btn.textContent = replie ? '›' : '‹';
      btn.title = replie ? 'Afficher le résumé' : 'Masquer le résumé';
    }
  },

  // Séances au studio (cases « faite » de la grille) : colonnes = semaines du programme
  // le plus long en cours, lignes = séances au studio ; puis la phase en cours de chaque plan cardio
  _seancesHtml(progs, semaines, cardio) {
    const jour = d => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const table = (colonnes, lignes) => `
      <div class="fr-grille"><table class="st-table">
        <tr><th></th>${colonnes.map(k => `<th>${k}</th>`).join('')}</tr>
        ${lignes.join('')}
      </table></div>`;
    let renfo = '';
    const avecStudio = progs.filter(p => (p.seances || []).some(s => !s.cardio && s.lieu === 'studio'));
    if (avecStudio.length) {
      const nbSem = Math.max(...avecStudio.map(p => p.nb_semaines || 4));
      const numeros = new Map();   // id de séance → n° de séance
      for (const p of avecStudio) for (const s of p.seances) if (!s.cardio && s.lieu === 'studio') numeros.set(s.id, (s.ordre ?? 0) + 1);
      const cochees = new Map();   // n° → Map(semaine → date)
      for (const l of semaines) {
        const n = numeros.get(l.seance_id);
        if (!n) continue;
        if (!cochees.has(n)) cochees.set(n, new Map());
        cochees.get(n).set(l.semaine, l.faite_le);
      }
      const colonnes = Array.from({ length: nbSem }, (_, i) => i + 1);
      renfo = table(colonnes, [...new Set(numeros.values())].sort((a, b) => a - b).map(n => `
        <tr><th class="st-seance">Séance ${n}</th>${colonnes.map(k => {
          const d = cochees.get(n)?.get(k);
          return `<td><span class="st-case ${d ? 'on' : ''}" ${d ? `data-info="Séance ${n}, semaine ${k} — faite le ${jour(d)}"` : ''}></span></td>`;
        }).join('')}</tr>`));
    }
    const cardioHtml = cardio.filter(p => p.actif).map(p => {
      const a = avancementCardio(p);
      if (!a.phase || !a.phase.seances.length) return '';
      return `<div class="fr-sous" style="margin-top:8px;">🏃 ${escHtml(p.nom)}</div>`
        + table(a.phase.seances.map((_, i) => i + 1), [`
          <tr><th class="st-seance">${escHtml(a.phase.nom || 'Phase')}</th>${a.phase.seances.map((s, i) =>
            `<td><span class="st-case ${s.faite ? 'on' : ''}" data-info="Séance ${i + 1}${s.faite ? ` — faite${s.faite_le ? ' le ' + jour(s.faite_le) : ''}` : ''}"></span></td>`).join('')}</tr>`]);
    }).join('');
    return renfo || cardioHtml ? renfo + cardioHtml : '';
  },

  // Après un enregistrement dans la fiche ouverte : relire le résumé
  rafraichir() {
    const id = Router.getParams().clientId;
    if (!id || !document.getElementById('ficheResume')) return;
    clearTimeout(this._minuteur);
    this._minuteur = setTimeout(() => this.afficher(id, true), 400);
  },

  async _construire(clientId, surNom) {
    const moi = Router.userProfile;
    const client = await db.getProfile(clientId);
    const nomClient = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client';
    surNom(nomClient);
    FicheOnglets.nommer(clientId, nomClient);
    const studioSeul = client.type_client === 'studio';
    const suivi = !studioSeul && (moi.is_gerant || client.coach_referent_id === moi.id);
    const [prochain, progs, plan, bilans, journal, profil, coachs, cardio, actifs, semaines] = await Promise.all([
      client.type_client === 'distance' ? null : db.getProchainCoaching(clientId).catch(() => null),
      db.getCyclesClients(moi.id, true, clientId).catch(() => []),
      suivi ? db.getActivePlan(clientId).catch(() => null) : null,
      suivi ? db.getBilansDuClient(clientId).catch(() => []) : [],
      suivi ? db.getJournalSuivi(clientId).catch(() => null) : null,
      db.getFicheCoach(clientId).catch(() => null),
      db.getCoachs().catch(() => []),
      db.getCardioPlans(clientId).catch(() => []),
      db.getClientProgrammesActifs(clientId).catch(() => []),
      db.getSemainesStudioClient(clientId).catch(() => []),
    ]);
    const seancesHtml = this._seancesHtml(actifs, semaines, cardio);
    const nomCoach = id => coachs.find(x => x.id === id)?.prenom || '';
    const types = { suivi: 'Studio + suivi', distance: 'Suivi à distance', studio: 'Studio sans suivi' };
    const bloc = (titre, contenu) => `<div class="fr-bloc"><div class="fr-titre">${titre}</div><div class="fr-valeur">${contenu}</div></div>`;
    const vide = t => `<span class="fr-vide">${t}</span>`;

    let prochainHtml = vide('Aucun prévu');
    if (prochain) {
      const d = new Date(prochain.debut);
      prochainHtml = `${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
        + (nomCoach(prochain.coach_id) ? `<div class="fr-sous">avec ${escHtml(nomCoach(prochain.coach_id))}</div>` : '');
    }

    const progHtml = progs.length ? progs.map(p => {
      const a = CoachAccueilPage._avancement(p);
      return `<div>${escHtml(p.nom)}</div><div class="fr-sous">${a.termine ? 'terminé' : `sem. ${a.faites}/${a.nb}`}</div>`;
    }).join('') : vide('Aucun programme');

    // Plans cardio en cours : phase en cours et séances faites dans cette phase
    const cardioHtml = cardio.filter(p => p.actif).map(p => {
      const a = avancementCardio(p);
      return `<div>${escHtml(p.nom)}</div><div class="fr-sous">${!a.phase ? 'aucune séance'
        : `${escHtml(a.phase.nom || 'Phase')} · ${a.prochaine ? `séance ${a.prochaine.n}/${a.phase.seances.length}` : 'terminé'}`}</div>`;
    }).join('');

    const planHtml = plan
      ? `${plan.calories_cible || '—'} kcal<div class="fr-sous">P ${plan.proteines_cible || 0} · G ${plan.glucides_cible || 0} · L ${plan.lipides_cible || 0}</div>`
      : vide('Sans plan');

    const dernier = [...bilans].sort((a, b) => (b.semaine || '').localeCompare(a.semaine || ''))[0];
    const bilanHtml = !dernier ? vide('Aucun')
      : dernier.statut !== 'complete' ? 'En attente'
      : `Rempli<div class="fr-sous">${dernier.completed_at ? new Date(dernier.completed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</div>`;

    let journalHtml = vide('—');
    if (journal && typeof SuiviSemaine !== 'undefined') {
      const e = SuiviSemaine.etat({ date_debut: client.date_debut, journal_suivi: journal.lignes, journal_suivi_entete: journal.entete ? [journal.entete] : [] });
      journalHtml = { fait: `Sem. ${e.k} faite`, a_faire: `Sem. ${e.k} à faire`, retard: `<span class="fr-rouge">Retard ${e.retard} sem.</span>`,
        sans_date: vide('Date de début à régler'), a_venir: vide('Pas encore commencé'), termine: vide('Suivi terminé') }[e.cle];
    }

    const points = n => '●'.repeat(n || 0) + '○'.repeat(3 - (n || 0));
    const profilHtml = profil
      ? `<div class="fr-profil"><span>Discuter</span><b>${points(profil.aime_discuter)}</b></div>
         <div class="fr-profil"><span>Technique</span><b>${points(profil.technique)}</b></div>
         <div class="fr-profil"><span>Copain → Pro</span><b>${points(profil.style_pro)}</b></div>
         <div class="fr-profil"><span>Douceur → Énergie</span><b>${points(profil.energie)}</b></div>
         <div class="fr-sous">${profil.vouvoiement ? 'Vouvoiement' : 'Tutoiement'}</div>
         ${profil.topo ? `<div class="fr-topo">${escHtml(profil.topo)}</div>` : ''}`
      : vide('Pas encore rempli');

    return `
      <div class="fr-entete">
        <div class="fr-nom">${escHtml(`${client.prenom || ''} ${client.nom || ''}`.trim())}</div>
        <div class="fr-sous">${types[client.type_client] || ''}${nomCoach(client.coach_referent_id) ? ' · ' + escHtml(nomCoach(client.coach_referent_id)) : ''}</div>
        ${client.telephone ? `<div class="fr-sous">${escHtml(client.telephone)}</div>` : ''}
      </div>
      ${studioSeul && !prochain ? '' : bloc('Prochain coaching', prochainHtml)}
      ${bloc('Entraînement', progHtml)}
      ${cardioHtml ? bloc('Cardio', cardioHtml) : ''}
      ${suivi ? bloc('Nutrition', planHtml) + bloc('Dernier bilan', bilanHtml) + bloc('Journal de suivi', journalHtml) : ''}
      ${bloc('Profil coaching', profilHtml)}
      ${seancesHtml ? bloc('Séances au studio', seancesHtml) : ''}
      <div class="fr-actions">
        <button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-client-messages',{clientId:'${clientId}'})">💬 Message</button>
        ${suivi ? `<button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-journal-suivi',{clientId:'${clientId}'})">📋 Journal de suivi</button>` : ''}
      </div>`;
  },
};

// Plans d'entraînement du client ouverts en onglets (fiche duo, plusieurs programmes…) :
// chaque grille du studio des programmes en cours et chaque plan cardio en cours.
// Renvoie la barre à afficher en haut de la grille ou du plan, vide s'il n'y a qu'un plan.
async function barrePlansClient(clientId, courantId) {
  const [progs, cardio] = await Promise.all([
    db.getClientProgrammesActifs(clientId).catch(() => []),
    db.getCardioPlans(clientId).catch(() => []),
  ]);
  const plans = [];
  for (const p of progs) {
    const studio = (p.seances || []).filter(s => s.lieu === 'studio' && !s.cardio).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    for (const s of studio) plans.push({ id: s.id, icone: '📋', nom: studio.length > 1 ? `${p.nom} · ${s.nom}` : p.nom,
      aller: `Router.navigate('coach-seance-studio',{seanceId:'${s.id}',clientId:'${clientId}'})` });
  }
  for (const c of cardio.filter(c => c.actif)) plans.push({ id: c.id, icone: '🏃', nom: c.nom,
    aller: `Router.navigate('coach-cardio-plan',{clientId:'${clientId}',planId:'${c.id}'})` });
  if (plans.length < 2) return '';
  return `<div class="plans-barre">${plans.map(p => `
    <button class="${p.id === courantId ? 'on' : ''}" title="${escHtml(p.nom)}" ${p.id === courantId ? '' : `onclick="${p.aller}"`}>${p.icone} ${escHtml(p.nom)}</button>`).join('')}
  </div>`;
}

// Appelé par le routeur à chaque écran : barre d'onglets et résumé sur une fiche
function afficherFiche(hash) {
  const clientId = Router.getParams().clientId;
  const fiche = Router.userProfile?.role === 'coach' && ECRANS_FICHE.includes(hash) && clientId;
  let barre = document.getElementById('ficheOnglets');
  let resume = document.getElementById('ficheResume');
  if (!fiche) {
    document.body.classList.remove('fiche-ouverte');
    barre?.remove(); resume?.remove();
    return;
  }
  const app = document.getElementById('app');
  if (!barre) { barre = document.createElement('div'); barre.id = 'ficheOnglets'; barre.className = 'fiche-onglets'; document.body.insertBefore(barre, app); }
  if (!resume) {
    resume = document.createElement('aside'); resume.id = 'ficheResume'; resume.className = 'fiche-resume';
    resume.innerHTML = `<button class="fr-replier" onclick="FicheResume.replier()"></button><div id="ficheResumeCorps"></div>`;
    document.body.insertBefore(resume, app);
    FicheResume.replier(FicheResume._replie());
  }
  document.body.classList.add('fiche-ouverte');
  // depuisSuivi n'est pas gardé : rouvrir l'onglet plus tard ne doit pas remettre la barre « Suivant »
  const { clientId: _, depuisSuivi: __, ...params } = Router.getParams();
  FicheOnglets.noter(clientId, hash, params);
  FicheOnglets.afficher(clientId);
  FicheResume.afficher(clientId);
}

// Le résumé suit les enregistrements faits dans la fiche (profil, type, plan, programme, journal…)
['saveFicheCoach', 'updateProfile', 'upsertPlan', 'updateActivePlanMacros', 'assignProgrammeFromTemplate',
 'deactivateClientProgramme', 'reactiverClientProgramme', 'redemarrerProgramme', 'saveJournalLigne',
 'saveClientProgrammeSeances', 'saveClientProgrammeNom', 'markBilansAsRead', 'saveJournalEntete',
 'setSeanceLieu', 'setSemaineStudio', 'setClientActif', 'attribuerPlanCardio', 'majCardioRacine', 'majCardioSeance'].forEach(nom => {
  const origine = db[nom];
  if (typeof origine !== 'function') return;
  db[nom] = async function (...args) {
    const r = await origine.apply(this, args);
    FicheResume.rafraichir();
    return r;
  };
});
