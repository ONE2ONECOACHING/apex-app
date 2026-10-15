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
  'coach-seance-studio', 'coach-programme-archive'];

const FicheOnglets = {
  _cle() { return 'ficheOnglets_' + (Router.userProfile?.id || ''); },

  lire() {
    try { return JSON.parse(localStorage.getItem(this._cle()) || '[]'); } catch (_) { return []; }
  },

  ecrire(liste) {
    try { localStorage.setItem(this._cle(), JSON.stringify(liste.slice(-12))); } catch (_) {}
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
    const liste = this.lire();
    const o = liste.find(x => x.id === clientId);
    if (o && o.nom !== nom) { o.nom = nom; this.ecrire(liste); this.afficher(clientId); }
  },

  aller(clientId) {
    const o = this.lire().find(x => x.id === clientId);
    if (o) Router.navigate(o.page, { ...(o.params || {}), clientId });
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
        <div class="fo-onglet ${o.id === actifId ? 'on' : ''}" onclick="FicheOnglets.aller('${o.id}')" title="${escHtml(o.nom)}">
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

  async chercher(ouvrir = true) {
    const zone = document.getElementById('foRecherche');
    if (!zone) return;
    zone.hidden = !ouvrir || !zone.hidden;
    if (zone.hidden) return;
    const champ = document.getElementById('foChamp');
    champ.value = ''; champ.focus();
    document.getElementById('foResultats').innerHTML = '';
    if (!this._clients) this._clients = await db.getClientsAgenda().catch(() => []);
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
  _cache: new Map(),   // clientId → { le, html }

  async afficher(clientId) {
    const el = document.getElementById('ficheResume');
    if (!el) return;
    const c = this._cache.get(clientId);
    if (c) el.innerHTML = c.html;
    else el.innerHTML = '<div class="spinner" style="margin:2rem auto;"></div>';
    if (c && Date.now() - c.le < 60000) return;
    const html = await this._construire(clientId).catch(e => `<div class="fr-vide">${escHtml(e.message)}</div>`);
    this._cache.set(clientId, { le: Date.now(), html });
    if (Router.getParams().clientId === clientId && document.getElementById('ficheResume')) {
      document.getElementById('ficheResume').innerHTML = html;
    }
  },

  // Après un changement dans la fiche (programme, plan…), relire au prochain affichage
  oublier(clientId) { this._cache.delete(clientId); },

  async _construire(clientId) {
    const moi = Router.userProfile;
    const client = await db.getProfile(clientId);
    FicheOnglets.nommer(clientId, `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client');
    const studioSeul = client.type_client === 'studio';
    const suivi = !studioSeul && (moi.is_gerant || client.coach_referent_id === moi.id);
    const [prochain, progs, plan, bilans, journal, profil, coachs] = await Promise.all([
      client.type_client === 'distance' ? null : db.getProchainCoaching(clientId).catch(() => null),
      db.getCyclesClients(moi.id, true, clientId).catch(() => []),
      suivi ? db.getActivePlan(clientId).catch(() => null) : null,
      suivi ? db.getBilansDuClient(clientId).catch(() => []) : [],
      suivi ? db.getJournalSuivi(clientId).catch(() => null) : null,
      db.getFicheCoach(clientId).catch(() => null),
      db.getCoachs().catch(() => []),
    ]);
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
      ${suivi ? bloc('Nutrition', planHtml) + bloc('Dernier bilan', bilanHtml) + bloc('Journal de suivi', journalHtml) : ''}
      ${bloc('Profil coaching', profilHtml)}
      <div class="fr-actions">
        <button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-client-messages',{clientId:'${clientId}'})">💬 Message</button>
        ${suivi ? `<button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-journal-suivi',{clientId:'${clientId}'})">📋 Journal de suivi</button>` : ''}
      </div>`;
  },
};

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
  if (!resume) { resume = document.createElement('aside'); resume.id = 'ficheResume'; resume.className = 'fiche-resume'; document.body.insertBefore(resume, app); }
  document.body.classList.add('fiche-ouverte');
  const { clientId: _, ...params } = Router.getParams();
  FicheOnglets.noter(clientId, hash, params);
  FicheOnglets.afficher(clientId);
  FicheResume.afficher(clientId);
}
