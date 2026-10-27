// APEX APP — Gérant : fiche client, onglet Facturation
// Mode (profiles.mode_facturation, utilisé aussi par l'agenda pour « inclus / en plus »)
// et montants (table facturation_clients, réservée aux gérants).
// Abonnement : formule du catalogue → montant mensuel, modifiable pour ce client.
// Consommation : prix fixe par séance, propre au client.

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
      </div>`;
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
