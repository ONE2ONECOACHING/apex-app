// APEX APP — Gérant : fiche client, onglet Facturation
// Mode (profiles.mode_facturation, utilisé aussi par l'agenda pour « inclus / en plus »)
// et montants (table facturation_clients, réservée aux gérants).
// Abonnement : formule du catalogue → montant mensuel, modifiable pour ce client.
// Consommation : prix fixe par séance, propre au client.

// Stripe (lecture seule, étape 6b-1) : libellés partagés avec la facturation du mois
const STRIPE_ABO = { active: 'À jour', trialing: 'Essai', past_due: 'Paiement en retard', unpaid: 'Impayé',
  incomplete: 'Premier paiement pas fait', paused: 'En pause', canceled: 'Arrêté', incomplete_expired: 'Expiré' };
const STRIPE_ABO_OK = ['active', 'trialing'];
const STRIPE_PAIEMENT = { succeeded: 'Payé', failed: 'Refusé', pending: 'En cours' };
const RYTHME = { month: 'mois', year: 'an', week: 'semaine', day: 'jour' };
// Carte « MM/AAAA » : 'expiree' (mois passé), 'bientot' (expire ce mois-ci) ou ''
function etatCarte(expire) {
  const m = /^(\d{2})\/(\d{4})$/.exec(expire || '');
  if (!m) return '';
  const auj = new Date();
  const fin = Number(m[2]) * 12 + Number(m[1]), maintenant = auj.getFullYear() * 12 + auj.getMonth() + 1;
  return fin < maintenant ? 'expiree' : fin === maintenant ? 'bientot' : '';
}
let _stripeClients = null;   // liste des clients Stripe, chargée une fois par visite

const CoachClientFacturationPage = {
  client: null,
  factu: null,
  formules: [],

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · GÉRANT</div>
          <div class="app-title" id="cfTitre">Facturation</div>
        </div>
      </div>
      <div id="cfNav"></div>
      <div id="cfContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }
    const jeton = this._jeton = {};
    this.client = null;
    this.factu = null;
    document.getElementById('cfNav').innerHTML = coachClientNav(params.clientId, 'coach-client-facturation');
    if (!Router.userProfile?.is_gerant) {
      document.getElementById('cfContent').innerHTML = '<div class="card" style="font-size:13px;color:var(--gray-light);">La facturation est réservée aux gérants.</div>';
      return;
    }
    try {
      const [client, factu, formules] = await Promise.all([
        db.getProfile(params.clientId),
        db.getFacturationClient(params.clientId),
        db.getFormules(),
      ]);
      if (jeton !== this._jeton) return;
      this.client = client;
      this.factu = factu || {};
      this.formules = formules;
      document.getElementById('cfTitre').textContent = 'Facturation — ' + (client.prenom || 'Client');
      this._render();
    } catch (e) {
      if (jeton !== this._jeton) return;
      document.getElementById('cfContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _mode() {
    const c = this.client;
    return c.mode_facturation || (c.facturation_mixte ? 'mixte' : '');
  },

  _render() {
    const f = this.factu;
    const mode = this._mode();
    // Formules proposées : celles du catalogue, plus celle du client si elle a été retirée
    const proposees = this.formules.filter(x => x.actif || x.id === f.formule_id);
    document.getElementById('cfContent').innerHTML = `
      <div class="card">
        <div class="card-title">Facturation</div>
        <div class="field">
          <label class="field-label">Mode</label>
          <select class="input" id="cfMode" onchange="CoachClientFacturationPage.changerMode(this.value)">
            ${[['', '— Pas encore défini —'], ['abonnement', 'Abonnement'], ['consommation', 'Séances à la consommation'], ['mixte', 'Abonnement + séances à la consommation']]
              .map(([v, l]) => `<option value="${v}" ${mode === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          ${mode === 'mixte' ? '<div class="cf-aide">Dans l\'agenda, chaque coaching de ce client a la case « inclus dans l\'abonnement / en plus ». Seuls les coachings « en plus » sont facturés à la séance.</div>' : ''}
        </div>

        <div class="cf-bloc ${mode === 'abonnement' || mode === 'mixte' ? '' : 'hidden'}" id="cfAbo">
          <div class="cf-bloc-titre">Abonnement</div>
          <div class="field">
            <label class="field-label">Formule</label>
            <select class="input" id="cfFormule" onchange="CoachClientFacturationPage.choisirFormule(this.value)">
              <option value="">— Aucune (montant libre) —</option>
              ${proposees.map(x => `<option value="${x.id}" ${x.id === f.formule_id ? 'selected' : ''}>${escHtml(x.nom)} · ${euros(x.prix_mensuel)}${x.duree_mois ? ` · ${x.duree_mois} mois` : ''}${x.actif ? '' : ' (retirée)'}</option>`).join('')}
            </select>
            ${this.formules.length ? '' : '<div class="cf-aide">Aucune formule : crée-les dans Gérants › Formules.</div>'}
          </div>
          <div class="cf-grille">
            <div class="field"><label class="field-label">Montant par mois (€)</label>
              <input class="input" id="cfMontant" type="number" min="0" step="0.01" value="${f.montant_abonnement ?? ''}"></div>
            <div class="field"><label class="field-label">Début de l'abonnement</label>
              <input class="input" id="cfDebut" type="date" value="${f.debut_abonnement || ''}" onchange="CoachClientFacturationPage.calculerFin()"></div>
            <div class="field"><label class="field-label">Fin d'engagement</label>
              <input class="input" id="cfFin" type="date" value="${f.fin_engagement || ''}"></div>
          </div>
        </div>

        <div class="cf-bloc ${mode === 'consommation' || mode === 'mixte' ? '' : 'hidden'}" id="cfConso">
          <div class="cf-bloc-titre">Séances à la consommation</div>
          <div class="field" style="max-width:220px;"><label class="field-label">Prix par séance (€)</label>
            <input class="input" id="cfPrixSeance" type="number" min="0" step="0.01" value="${f.prix_seance ?? ''}"></div>
          <div class="cf-aide">Duo sur deux comptes : indique ici la part de ce client.</div>
        </div>

        <div class="field">
          <label class="field-label">Note (gérants)</label>
          <textarea class="input" id="cfNote" rows="2" placeholder="Ex. remise fidélité, paiement en 3 fois…">${escHtml(f.note || '')}</textarea>
        </div>
        <button class="btn btn-primary btn-small" onclick="CoachClientFacturationPage.enregistrer()">💾 Enregistrer</button>
        <div id="cfMsg" style="margin-top:0.75rem;"></div>
      </div>
      <div class="card" id="cfStripe"></div>`;
    this._afficherStripe();
  },

  // ── Stripe (lecture seule) ────────────────────────────────────────────────
  async _afficherStripe() {
    const zone = document.getElementById('cfStripe');
    const cus = this.factu.stripe_customer_id;
    const titre = '<div class="card-title">Stripe</div>';
    if (!cus) {
      zone.innerHTML = `${titre}
        <div class="cf-aide">Pas encore relié à un client Stripe.</div>
        <button class="btn btn-secondary btn-small" onclick="CoachClientFacturationPage.chercherStripe()">🔎 Chercher dans Stripe</button>
        <div id="cfStripeRecherche"></div>`;
      return;
    }
    zone.innerHTML = `${titre}<div class="spinner"></div>`;
    const jeton = this._jeton;
    try {
      const f = await db.stripe('fiche', { customer: cus });
      if (jeton !== this._jeton) return;
      const date = t => new Date(t * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      zone.innerHTML = `${titre}
        <div class="cf-stripe-entete">
          <div><div class="fa-nom">${escHtml(f.nom || '(sans nom)')}</div><div class="fa-sous">${escHtml(f.email || '')}</div></div>
          <div style="display:flex;gap:6px;">
            <a class="btn btn-secondary btn-small" href="https://dashboard.stripe.com/customers/${escHtml(f.id)}" target="_blank" rel="noopener">Ouvrir dans Stripe ↗</a>
            <button class="btn btn-secondary btn-small" onclick="CoachClientFacturationPage.delierStripe()">Délier</button>
          </div>
        </div>

        <div class="cf-bloc-titre">Moyen de paiement</div>
        ${f.moyens.length ? f.moyens.map(m => { const e = etatCarte(m.expire); return `<div class="cf-stripe-ligne ${e ? 'cf-stripe-alerte' : ''}">💳 ${escHtml(m.marque || m.type)} ···· ${escHtml(m.fin || '')}${m.expire ? ` · ${e === 'expiree' ? '<b>expirée</b> depuis' : e === 'bientot' ? '<b>expire ce mois-ci</b>,' : 'expire'} ${escHtml(m.expire)}` : ''}${m.defaut ? ' · <b>par défaut</b>' : ''}</div>`; }).join('')
          : '<div class="cf-stripe-ligne cf-stripe-alerte">Aucune carte ni RIB enregistré : impossible de prélever ce client.</div>'}

        <div class="cf-bloc-titre" style="margin-top:12px;">Abonnements Stripe</div>
        ${f.abonnements.length ? f.abonnements.map(a => `
          <div class="cf-stripe-ligne">
            <span class="cf-statut ${STRIPE_ABO_OK.includes(a.statut) ? 'ok' : a.statut === 'canceled' ? '' : 'ko'}">${STRIPE_ABO[a.statut] || escHtml(a.statut)}</span>
            ${a.lignes.map(l => `${l.nom ? escHtml(l.nom) + ' · ' : ''}${l.montant != null ? euros(l.montant) : ''}${l.rythme ? ' / ' + escHtml(RYTHME[l.rythme] || l.rythme) : ''}`).join(' + ')}
            ${a.statut !== 'canceled' && a.prochaine ? `<span class="fa-sous"> · ${a.fin_annoncee ? 'se termine le' : 'prochain prélèvement le'} ${date(a.prochaine)}</span>` : ''}
          </div>`).join('') : '<div class="cf-stripe-ligne fa-sous">Aucun abonnement.</div>'}

        <div class="cf-bloc-titre" style="margin-top:12px;">Derniers paiements</div>
        ${f.paiements.length ? `<table class="fa-table">${f.paiements.map(p => `
          <tr><td>${date(p.date)}</td><td class="num">${euros(p.montant)}${p.rembourse ? `<div class="fa-sous">remboursé ${euros(p.rembourse)}</div>` : ''}</td>
            <td><span class="cf-statut ${p.statut === 'succeeded' ? 'ok' : p.statut === 'failed' ? 'ko' : ''}">${STRIPE_PAIEMENT[p.statut] || escHtml(p.statut)}</span></td>
            <td class="fa-sous">${escHtml(p.erreur || p.description)}</td></tr>`).join('')}</table>`
          : '<div class="cf-stripe-ligne fa-sous">Aucun paiement.</div>'}`;
    } catch (e) {
      if (jeton !== this._jeton) return;
      zone.innerHTML = `${titre}<div class="alert alert-error">${escHtml(e.message)}</div>
        <button class="btn btn-secondary btn-small" style="margin-top:8px;" onclick="CoachClientFacturationPage.delierStripe()">Délier</button>`;
    }
  },

  async chercherStripe() {
    const zone = document.getElementById('cfStripeRecherche');
    zone.innerHTML = '<div class="spinner"></div>';
    try {
      if (!_stripeClients) _stripeClients = await db.stripe('clients');
      const c = this.client;
      zone.innerHTML = `
        <input class="input" id="cfStripeQ" style="margin-top:10px;" placeholder="Nom ou email du client dans Stripe"
          value="${escHtml(c.email && !c.email.includes('@clients.one2onecoaching.fr') ? c.email : `${c.prenom || ''} ${c.nom || ''}`.trim())}"
          oninput="CoachClientFacturationPage._listeStripe()">
        <div id="cfStripeListe"></div>`;
      this._listeStripe();
    } catch (e) {
      zone.innerHTML = '<div class="alert alert-error" style="margin-top:8px;">' + escHtml(e.message) + '</div>';
    }
  },

  _listeStripe() {
    const q = document.getElementById('cfStripeQ').value.trim().toLowerCase();
    const mots = q.split(/\s+/).filter(Boolean);
    const trouves = mots.length
      ? _stripeClients.filter(x => mots.every(m => `${x.nom} ${x.email}`.toLowerCase().includes(m))).slice(0, 15)
      : [];
    document.getElementById('cfStripeListe').innerHTML = trouves.length
      ? trouves.map(x => `
          <div class="cf-stripe-choix">
            <div><div class="fa-nom">${escHtml(x.nom || '(sans nom)')}</div><div class="fa-sous">${escHtml(x.email || '')}</div></div>
            <button class="btn btn-primary btn-small" onclick="CoachClientFacturationPage.relierStripe('${escHtml(x.id)}')">Relier</button>
          </div>`).join('')
      : `<div class="cf-aide" style="margin-top:8px;">${mots.length ? 'Aucun client Stripe trouvé.' : 'Tape un nom ou un email.'}</div>`;
  },

  async relierStripe(cus) {
    try {
      this.factu = await db.relierStripe(this.client.id, cus);
      toast('Client relié à Stripe', 'success');
      this._afficherStripe();
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  async delierStripe() {
    if (!confirm('Délier ce client de sa fiche Stripe ?\n\nRien n\'est modifié dans Stripe.')) return;
    try {
      this.factu = await db.relierStripe(this.client.id, null);
      this._afficherStripe();
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  changerMode(mode) {
    document.getElementById('cfAbo').classList.toggle('hidden', !['abonnement', 'mixte'].includes(mode));
    document.getElementById('cfConso').classList.toggle('hidden', !['consommation', 'mixte'].includes(mode));
  },

  // Une formule remplit le montant (et la fin d'engagement si la durée est connue)
  choisirFormule(id) {
    const x = this.formules.find(y => y.id === id);
    if (!x) return;
    document.getElementById('cfMontant').value = x.prix_mensuel;
    const debut = document.getElementById('cfDebut');
    if (!debut.value) debut.value = new Date().toLocaleDateString('sv-SE');
    this.calculerFin();
  },

  calculerFin() {
    const x = this.formules.find(y => y.id === document.getElementById('cfFormule').value);
    const debut = document.getElementById('cfDebut').value;
    if (!x?.duree_mois || !debut) return;
    const [a, m, j] = debut.split('-').map(Number);
    const fin = new Date(a, m - 1 + x.duree_mois, j);
    fin.setDate(fin.getDate() - 1);
    document.getElementById('cfFin').value = fin.toLocaleDateString('sv-SE');
  },

  async enregistrer() {
    const msg = document.getElementById('cfMsg');
    const mode = document.getElementById('cfMode').value || null;
    const nombre = id => { const v = document.getElementById(id).value; return v === '' ? null : Number(v); };
    const abo = ['abonnement', 'mixte'].includes(mode);
    const conso = ['consommation', 'mixte'].includes(mode);
    // Les montants du mode non choisi sont gardés : on peut revenir en arrière sans les perdre
    const champs = {
      formule_id: document.getElementById('cfFormule').value || null,
      montant_abonnement: nombre('cfMontant'),
      debut_abonnement: document.getElementById('cfDebut').value || null,
      fin_engagement: document.getElementById('cfFin').value || null,
      prix_seance: nombre('cfPrixSeance'),
      note: document.getElementById('cfNote').value.trim() || null,
    };
    const manque = [abo && champs.montant_abonnement == null && 'le montant par mois',
                    conso && champs.prix_seance == null && 'le prix par séance'].filter(Boolean);
    try {
      if (mode !== (this.client.mode_facturation || null)) {
        await db.updateProfile(this.client.id, { mode_facturation: mode, facturation_mixte: mode === 'mixte' });
        this.client.mode_facturation = mode;
        this.client.facturation_mixte = mode === 'mixte';
        if (typeof _ficheClients !== 'undefined') _ficheClients.delete(this.client.id);
      }
      this.factu = await db.saveFacturationClient(this.client.id, champs);
      msg.innerHTML = manque.length
        ? `<div class="alert alert-error">Enregistré, mais il manque ${manque.join(' et ')} : ce client sera « à compléter » dans la facturation du mois.</div>`
        : '<div class="alert alert-success">✓ Enregistré</div>';
    } catch (e) {
      msg.innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },
};
