// APEX APP — Gérants : tableau de bord
// Chiffres du mois choisi (revenu encaissé Stripe, abonnements, clients actifs,
// arrivées / départs, heures coachées, revenu par heure), graphiques mois par mois
// (revenu cette année / l'an dernier, heures par coach, arrivées / départs),
// détail par coach et argent à surveiller (impayés, cartes expirées, séances pas
// encore prélevées, fins d'engagement). Revenu = paiements Stripe réussis moins
// les remboursements (tout le compte). Heures : agenda, depuis le 9 octobre 2026.

const GERANTS_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const CoachGerantsPage = {
  mois: null,      // Date du 1er du mois affiché
  app: null,       // données de l'app (clients, coachs, agenda, facturation)
  stripe: null,    // { revenus, abonnements } | { erreur }
  etats: null,     // état des cartes des clients reliés à Stripe

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · GÉRANTS</div>
          <div class="app-title">Tableau de bord</div>
        </div>
      </div>
      <div class="fa-mois">
        <button class="btn btn-secondary btn-small" onclick="CoachGerantsPage.changerMois(-1)">‹</button>
        <span id="geMois"></span>
        <button class="btn btn-secondary btn-small" onclick="CoachGerantsPage.changerMois(1)">›</button>
      </div>
      <div id="geContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="geBulle" class="ge-bulle"></div>`;
  },

  async init() {
    const me = Router.userProfile;
    if (!me || me.role !== 'coach' || !me.is_gerant) { window.location.hash = '#coach-accueil'; return; }
    const jeton = this._jeton = {};
    const auj = new Date();
    this.mois = new Date(auj.getFullYear(), auj.getMonth(), 1);
    this.app = null; this.stripe = null; this.etats = null;
    this._titreMois();
    try {
      const debut = new Date(auj.getFullYear() - 1, 0, 1);
      const fin = new Date(auj.getFullYear(), auj.getMonth() + 1, 1);
      const moisDernier = new Date(auj.getFullYear(), auj.getMonth() - 1, 1);
      const [clients, coachs, coachings, factus, formules, prelevements] = await Promise.all([
        db.getClientsTableau(), db.getCoachs(),
        db.getCoachingsPeriode(debut.toISOString(), fin.toISOString()),
        db.getFacturationsClients(), db.getFormules(),
        db.getPrelevements(this._cle(moisDernier) + '-01').catch(() => []),
      ]);
      if (jeton !== this._jeton) return;
      this.app = { clients, coachs: coachs.filter(c => c.id !== COMPTE_PARTAGE_ID), coachings, factus, formules, prelevements };
      this._render();
    } catch (e) {
      if (jeton !== this._jeton) return;
      document.getElementById('geContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
      return;
    }
    // Stripe ensuite (plus lent) : revenu, abonnements, puis cartes
    db.stripe('tableau')
      .then(r => { this.stripe = r; })
      .catch(e => { this.stripe = { erreur: e.message }; })
      .then(() => { if (jeton === this._jeton) this._render(); });
    const cus = [...new Set(this.app.factus.map(f => f.stripe_customer_id).filter(Boolean))];
    if (cus.length) db.stripe('etats', { customers: cus })
      .then(r => { this.etats = r; })
      .catch(() => { this.etats = {}; })
      .then(() => { if (jeton === this._jeton) this._render(); });
  },

  changerMois(sens) {
    const m = new Date(this.mois.getFullYear(), this.mois.getMonth() + sens, 1);
    const auj = new Date();
    if (m > auj || m < new Date(auj.getFullYear() - 1, 0, 1)) return;
    this.mois = m;
    this._titreMois();
    if (this.app) this._render();
  },

  _titreMois() {
    const t = this.mois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    document.getElementById('geMois').textContent = t.charAt(0).toUpperCase() + t.slice(1);
  },

  _cle(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; },
  _cleIso(iso) { return this._cle(new Date(iso)); },
  _decaler(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); },
  _nomMois(d) { return GERANTS_MOIS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2); },
  _nomClient(c) { return `${c?.prenom || ''} ${c?.nom || ''}`.trim() || 'Client'; },
  _heures(h) { return h.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' h'; },

  _couleurCoach(id) {
    const i = this.app.coachs.findIndex(c => c.id === id);
    return i < 0 ? '#9CA3AF' : AGENDA_COULEURS[i % AGENDA_COULEURS.length];
  },

  // Heures coachées par mois et par coach
  _heuresPar() {
    const par = {};
    for (const c of this.app.coachings) {
      const k = this._cleIso(c.debut);
      par[k] ??= {};
      par[k][c.coach_id] = (par[k][c.coach_id] || 0) + (new Date(c.fin) - new Date(c.debut)) / 3600000;
    }
    return par;
  },

  _revenu(cle) { return this.stripe?.revenus?.[cle]?.montant ?? null; },

  // Variation en %, affichée « +12 % » / « −5 % »
  _variation(a, b) {
    if (a == null || !b) return '';
    const v = Math.round((a - b) / b * 100);
    return `<span class="ge-var ${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : '−'}${Math.abs(v)} %</span>`;
  },

  _render() {
    const m = this.mois, cle = this._cle(m);
    const precedent = this._decaler(m, -1), anPasse = this._decaler(m, -12);
    const enCours = cle === this._cle(new Date());
    const { clients, factus } = this.app;
    const heuresPar = this._heuresPar();
    const somme = o => Object.values(o || {}).reduce((t, h) => t + h, 0);
    const heures = somme(heuresPar[cle]), heuresAvant = somme(heuresPar[this._cle(precedent)]);
    const actifs = clients.filter(c => c.actif !== false);
    const nouveaux = clients.filter(c => c.created_at && this._cleIso(c.created_at) === cle);
    const perdus = clients.filter(c => c.inactif_depuis && this._cleIso(c.inactif_depuis) === cle);
    const st = this.stripe;
    const charge = st == null ? '<span class="ge-attente">…</span>' : '';
    const revenu = this._revenu(cle);
    const types = { suivi: 'studio + suivi', distance: 'distance', studio: 'studio' };
    const parType = Object.entries(types).map(([t, l]) => `${actifs.filter(c => (c.type_client || 'suivi') === t).length} ${l}`).join(' · ');

    const tuile = (titre, valeur, sous = '') => `
      <div class="ge-tuile"><div class="ge-tuile-titre">${titre}</div><div class="ge-tuile-val">${valeur}</div><div class="ge-tuile-sous">${sous}</div></div>`;

    document.getElementById('geContent').innerHTML = `
      ${st?.erreur ? `<div class="alert alert-error" style="margin-bottom:12px;">Stripe : ${escHtml(st.erreur)}</div>` : ''}
      <div class="ge-tuiles">
        ${tuile(`Revenu encaissé${enCours ? ' (mois en cours)' : ''}`, charge || (revenu != null ? euros(revenu) : '0 €'),
          charge ? '' : `${this._variation(revenu || 0, this._revenu(this._cle(precedent)))} vs ${this._nomMois(precedent)} · ${this._variation(revenu || 0, this._revenu(this._cle(anPasse)))} vs ${this._nomMois(anPasse)}`)}
        ${tuile('Abonnements en cours', charge || (st?.abonnements ? `${euros(st.abonnements.mensuel)}<small> / mois</small>` : '—'),
          st?.abonnements ? `${st.abonnements.nb} abonnement${st.abonnements.nb > 1 ? 's' : ''} Stripe` : '')}
        ${tuile('Clients actifs', actifs.length, parType)}
        ${tuile('Arrivées / départs', `<span class="ge-plus">+${nouveaux.length}</span> / <span class="ge-moins">−${perdus.length}</span>`,
          'nouveaux comptes / passés en inactif')}
        ${tuile('Heures coachées', this._heures(heures), `${this._variation(heures, heuresAvant)} vs ${this._nomMois(precedent)}`)}
        ${tuile('Revenu par heure coachée', charge || (heures && revenu ? euros(Math.round(revenu / heures)) : '—'), 'revenu encaissé ÷ heures coachées')}
      </div>

      <div class="ge-graphes">
        <div class="ac-bloc ge-graphe-bloc">
          <div class="ac-bloc-titre">Revenu encaissé par mois</div>
          <div id="geGrRevenu">${charge || ''}</div>
        </div>
        <div class="ac-bloc ge-graphe-bloc">
          <div class="ac-bloc-titre">Heures coachées par mois</div>
          <div id="geGrHeures"></div>
          <div class="ge-note">Agenda de l'app : depuis le 9 octobre 2026.</div>
        </div>
        <div class="ac-bloc ge-graphe-bloc">
          <div class="ac-bloc-titre">Arrivées et départs par mois</div>
          <div id="geGrClients"></div>
          <div class="ge-note">Départs notés depuis le 3 novembre 2026 ; avant, seuls les abonnements Stripe arrêtés sont connus.</div>
        </div>
      </div>

      <div class="ge-bas">
        <div class="ac-bloc">
          <div class="ac-bloc-titre">Par coach · ${this._nomMois(m)}</div>
          ${this._parCoachHtml(heuresPar[cle] || {}, heures)}
        </div>
        <div class="ac-bloc">
          <div class="ac-bloc-titre">Argent à surveiller</div>
          ${this._surveillerHtml()}
        </div>
      </div>`;

    if (st && !st.erreur) this._grRevenu();
    this._grHeures(heuresPar);
    this._grClients();
  },

  _parCoachHtml(heuresMois, total) {
    const { coachs, clients, coachings } = this.app;
    const cle = this._cle(this.mois);
    const lignes = coachs.map(co => ({
      co,
      h: heuresMois[co.id] || 0,
      n: coachings.filter(c => c.coach_id === co.id && this._cleIso(c.debut) === cle).length,
      suivis: clients.filter(c => c.actif !== false && c.coach_referent_id === co.id).length,
    })).filter(l => l.h || l.suivis).sort((a, b) => b.h - a.h);
    if (!lignes.length) return '<div class="ac-vide">Aucune donnée ce mois-ci.</div>';
    return `<table class="fa-table ge-table">
      <thead><tr><th>Coach</th><th class="num">Heures coachées</th><th class="num">Coachings</th><th class="num">Clients suivis</th><th>Part des heures</th></tr></thead>
      <tbody>${lignes.map(l => `
        <tr><td><span class="ge-pastille" style="background:${this._couleurCoach(l.co.id)}"></span>${escHtml(l.co.prenom || l.co.nom || '')}</td>
          <td class="num">${this._heures(l.h)}</td><td class="num">${l.n}</td><td class="num">${l.suivis}</td>
          <td><div class="ge-part"><div style="width:${total ? Math.round(l.h / total * 100) : 0}%;background:${this._couleurCoach(l.co.id)}"></div></div>
            <span class="fa-sous">${total ? Math.round(l.h / total * 100) : 0} %</span></td></tr>`).join('')}
      </tbody></table>`;
  },

  _surveillerHtml() {
    const { clients, factus, formules, coachings, prelevements } = this.app;
    const parCus = new Map(factus.filter(f => f.stripe_customer_id).map(f => [f.stripe_customer_id, f.client_id]));
    const client = id => clients.find(c => c.id === id);
    const lien = id => `onclick="Router.navigate('coach-client-facturation',{clientId:'${id}'})"`;
    const blocs = [];

    // Abonnements Stripe impayés
    if (this.stripe?.abonnements) {
      const imp = this.stripe.abonnements.impayes;
      blocs.push(`<div class="ge-surv-titre">Abonnements impayés <span>${imp.length}</span></div>` + (imp.length
        ? imp.map(x => { const id = parCus.get(x.customer); return `<div class="ge-surv-ligne" ${id ? lien(id) : ''}>
            <span>${id ? escHtml(this._nomClient(client(id))) : 'Client Stripe pas relié à l\'app'}</span>
            <span class="cf-statut ko">${STRIPE_ABO[x.statut] || x.statut} · ${euros(x.montant)}/mois</span></div>`; }).join('')
        : '<div class="ge-surv-ok">Aucun ✓</div>'));
    } else if (!this.stripe) blocs.push('<div class="ge-surv-titre">Abonnements impayés <span class="ge-attente">…</span></div>');

    // Cartes expirées ou qui expirent ce mois-ci
    if (this.etats) {
      const cartes = [...parCus].map(([cus, id]) => ({ id, e: this.etats[cus] }))
        .filter(x => x.e?.moyen && etatCarte(x.e.moyen.expire) && client(x.id)?.actif !== false);
      blocs.push(`<div class="ge-surv-titre">Cartes expirées ou qui expirent ce mois-ci <span>${cartes.length}</span></div>` + (cartes.length
        ? cartes.map(x => `<div class="ge-surv-ligne" ${lien(x.id)}><span>${escHtml(this._nomClient(client(x.id)))}</span>
            <span class="cf-statut ko">···· ${escHtml(x.e.moyen.fin || '')} · ${escHtml(x.e.moyen.expire)}</span></div>`).join('')
        : '<div class="ge-surv-ok">Aucune ✓</div>'));
    } else if (factus.some(f => f.stripe_customer_id)) blocs.push('<div class="ge-surv-titre">Cartes expirées <span class="ge-attente">…</span></div>');

    // Séances du mois dernier pas encore prélevées
    const auj = new Date();
    const debut = new Date(auj.getFullYear(), auj.getMonth() - 1, 1), fin = new Date(auj.getFullYear(), auj.getMonth(), 1);
    const { lignes } = CoachFacturationPage._lignes({
      clients, factus, formules, fin,
      coachings: coachings.filter(c => new Date(c.debut) >= debut && new Date(c.debut) < fin),
    });
    const faits = new Set(prelevements.filter(p => p.statut !== 'refuse').map(p => p.client_id));
    const reste = lignes.filter(l => l.montantSeances && !faits.has(l.cl.id));
    const total = reste.reduce((t, l) => t + l.montantSeances, 0);
    blocs.push(`<div class="ge-surv-titre">Séances de ${GERANTS_MOIS[debut.getMonth()]} pas encore prélevées <span>${reste.length}</span></div>` + (reste.length
      ? `<div class="ge-surv-ligne" onclick="window.location.hash='#coach-facturation'"><span>${reste.length} client${reste.length > 1 ? 's' : ''} · à prélever dans Facturation ›</span><b>${euros(total)}</b></div>`
      : '<div class="ge-surv-ok">Tout est prélevé ✓</div>'));

    // Fins d'engagement dans les 60 jours
    const dans60 = new Date(Date.now() + 60 * 864e5).toLocaleDateString('sv-SE'), ajd = auj.toLocaleDateString('sv-SE');
    const fins = factus.filter(f => f.fin_engagement && f.fin_engagement >= ajd && f.fin_engagement <= dans60 && client(f.client_id)?.actif !== false)
      .sort((a, b) => a.fin_engagement.localeCompare(b.fin_engagement));
    blocs.push(`<div class="ge-surv-titre">Fins d'engagement dans les 60 jours <span>${fins.length}</span></div>` + (fins.length
      ? fins.map(f => `<div class="ge-surv-ligne" ${lien(f.client_id)}><span>${escHtml(this._nomClient(client(f.client_id)))}</span>
          <span class="fa-sous">${new Date(f.fin_engagement + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></div>`).join('')
      : '<div class="ge-surv-ok">Aucune</div>'));

    return blocs.join('');
  },

  // ── Graphiques (barres SVG, bulle au survol) ──────────────────────────────
  // groupes : [{ libelle, valeurs: [n par série] }] ; series : [{ nom, couleur }]
  _barres(id, groupes, series, { empile = false, format = v => v } = {}) {
    const zone = document.getElementById(id);
    if (!zone) return;
    const L = 640, H = 220, g = 34, b = 22, d = 8;
    const totaux = groupes.map(gr => empile ? gr.valeurs.reduce((t, v) => t + (v || 0), 0) : Math.max(0, ...gr.valeurs.map(v => v || 0)));
    const max = Math.max(1, ...totaux);
    const pas = this._pas(max);
    const haut = Math.ceil(max / pas) * pas;
    const y = v => H - b - (v / haut) * (H - b - 10);
    const larg = (L - g - d) / groupes.length;
    const barre = empile ? Math.min(28, larg * 0.6) : Math.min(14, (larg * 0.7) / series.length);
    let svg = '';
    for (let v = 0; v <= haut; v += pas) {
      svg += `<line x1="${g}" x2="${L - d}" y1="${y(v)}" y2="${y(v)}" class="ge-grille"/>
        <text x="${g - 6}" y="${y(v) + 4}" class="ge-axe" text-anchor="end">${this._court(v)}</text>`;
    }
    groupes.forEach((gr, i) => {
      const x0 = g + i * larg + larg / 2;
      let base = 0;
      gr.valeurs.forEach((v, s) => {
        if (!v) return;
        const x = empile ? x0 - barre / 2 : x0 - (series.length * (barre + 2)) / 2 + s * (barre + 2);
        const y1 = y(empile ? base + v : v), y0 = y(empile ? base : 0);
        const h = Math.max(1, y0 - y1 - (empile ? 1 : 0));
        svg += `<rect x="${x}" y="${y1}" width="${barre}" height="${h}" rx="3" fill="${series[s].couleur}"/>`;
        if (empile) base += v;
      });
      svg += `<text x="${x0}" y="${H - 6}" class="ge-axe" text-anchor="middle">${escHtml(gr.libelle)}</text>`;
      // zone de survol de toute la colonne : détail du mois
      svg += `<rect x="${g + i * larg}" y="0" width="${larg}" height="${H - b}" fill="transparent" class="ge-survol"
        data-bulle="${escHtml(gr.libelle + ' — ' + series.map((s, k) => `${s.nom} : ${format(gr.valeurs[k] || 0)}`).join(' · ') + (empile ? ` · total : ${format(totaux[i])}` : ''))}"/>`;
    });
    zone.innerHTML = `
      <div class="ge-legende">${series.map(s => `<span><i style="background:${s.couleur}"></i>${escHtml(s.nom)}</span>`).join('')}</div>
      <svg viewBox="0 0 ${L} ${H}" class="ge-svg" role="img">${svg}</svg>`;
    const bulle = document.getElementById('geBulle');
    zone.querySelectorAll('[data-bulle]').forEach(el => {
      el.addEventListener('mousemove', e => {
        bulle.textContent = el.dataset.bulle;
        bulle.style.display = 'block';
        bulle.style.left = Math.min(e.clientX + 12, window.innerWidth - bulle.offsetWidth - 8) + 'px';
        bulle.style.top = (e.clientY + 14) + 'px';
      });
      el.addEventListener('mouseleave', () => { bulle.style.display = 'none'; });
    });
  },

  _pas(max) {
    const brut = max / 4, p = 10 ** Math.floor(Math.log10(brut));
    return [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= brut) || p * 10;
  },
  _court(v) { return v >= 1000 ? (v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k' : v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }); },

  // Revenu : 12 mois de l'année du mois affiché, comparés à l'année d'avant
  _grRevenu() {
    const an = this.mois.getFullYear();
    const groupes = GERANTS_MOIS.map((nom, i) => ({
      libelle: nom,
      valeurs: [this._revenu(`${an - 1}-${String(i + 1).padStart(2, '0')}`) || 0, this._revenu(`${an}-${String(i + 1).padStart(2, '0')}`) || 0],
    }));
    this._barres('geGrRevenu', groupes, [{ nom: String(an - 1), couleur: '#B8C4D6' }, { nom: String(an), couleur: '#004AAD' }], { format: euros });
  },

  // Heures : 12 derniers mois jusqu'au mois affiché, empilées par coach
  _grHeures(heuresPar) {
    const mois = Array.from({ length: 12 }, (_, i) => this._decaler(this.mois, i - 11));
    const coachs = this.app.coachs.filter(co => mois.some(m => heuresPar[this._cle(m)]?.[co.id]));
    if (!coachs.length) { document.getElementById('geGrHeures').innerHTML = '<div class="ac-vide">Pas encore de coachings dans l\'agenda.</div>'; return; }
    this._barres('geGrHeures', mois.map(m => ({ libelle: this._nomMois(m), valeurs: coachs.map(co => heuresPar[this._cle(m)]?.[co.id] || 0) })),
      coachs.map(co => ({ nom: co.prenom || co.nom || 'Coach', couleur: this._couleurCoach(co.id) })),
      { empile: true, format: h => this._heures(h) });
  },

  // Arrivées (comptes créés) et départs (inactifs + abonnements Stripe arrêtés)
  _grClients() {
    const mois = Array.from({ length: 12 }, (_, i) => this._decaler(this.mois, i - 11));
    const compte = (liste, cle) => liste.filter(x => x === cle).length;
    const arrivees = this.app.clients.filter(c => c.created_at).map(c => this._cleIso(c.created_at));
    const departs = this.app.clients.filter(c => c.inactif_depuis).map(c => this._cleIso(c.inactif_depuis));
    const arretes = (this.stripe?.abonnements?.arretes || []).map(x => x.mois);
    const series = [{ nom: 'Nouveaux clients', couleur: '#004AAD' }, { nom: 'Passés en inactif', couleur: '#E8833A' }];
    if (arretes.length) series.push({ nom: 'Abonnements Stripe arrêtés', couleur: '#B8C4D6' });
    this._barres('geGrClients', mois.map(m => {
      const k = this._cle(m);
      return { libelle: this._nomMois(m), valeurs: [compte(arrivees, k), compte(departs, k), ...(arretes.length ? [compte(arretes, k)] : [])] };
    }), series);
  },
};
