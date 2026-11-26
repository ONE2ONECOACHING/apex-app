// APEX APP — Gérant : catalogue des formules d'abonnement
// Nom, prix mensuel, durée d'engagement (facultative). Une formule retirée du
// catalogue n'est plus proposée, mais les clients qui l'ont la gardent.

const euros = n => (n == null || n === '') ? '—'
  : Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number(n) % 1 ? 2 : 0 });

const CoachFormulesPage = {
  formules: [],
  _edition: null,      // id de la formule en cours de modification, 'nouvelle' pour une création

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · GÉRANT</div>
          <div class="app-title">Formules</div>
        </div>
      </div>
      <div id="foContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    this.formules = [];
    this._edition = null;
    const me = Router.userProfile;
    if (!me || me.role !== 'coach' || !me.is_gerant) { window.location.hash = '#coach-accueil'; return; }
    try {
      this.formules = await db.getFormules();
      this._render();
    } catch (e) {
      document.getElementById('foContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _formulaire(f) {
    return `
      <tr class="fo-edition"><td colspan="4">
        <div class="fo-form">
          <div class="field"><label class="field-label">Nom</label>
            <input class="input" id="foNom" value="${escHtml(f?.nom || '')}" placeholder="Ex. Coaching 2 séances / semaine"></div>
          <div class="field"><label class="field-label">Prix par mois (€)</label>
            <input class="input" id="foPrix" type="number" min="0" step="0.01" value="${f?.prix_mensuel ?? ''}"></div>
          <div class="field"><label class="field-label">Engagement (mois)</label>
            <input class="input" id="foDuree" type="number" min="1" max="60" step="1" value="${f?.duree_mois ?? ''}" placeholder="Sans"></div>
          <div class="fo-form-btns">
            <button class="btn btn-primary btn-small" onclick="CoachFormulesPage.enregistrer()">💾 Enregistrer</button>
            <button class="btn btn-secondary btn-small" onclick="CoachFormulesPage.annuler()">Annuler</button>
          </div>
        </div>
        <div id="foErreur"></div>
      </td></tr>`;
  },

  _render() {
    const actives = this.formules.filter(f => f.actif);
    const retirees = this.formules.filter(f => !f.actif);
    const ligne = f => this._edition === f.id ? this._formulaire(f) : `
      <tr class="${f.actif ? '' : 'fo-retiree'}">
        <td class="fo-nom">${escHtml(f.nom)}</td>
        <td>${euros(f.prix_mensuel)} / mois</td>
        <td>${f.duree_mois ? `${f.duree_mois} mois` : 'Sans engagement'}</td>
        <td class="fo-actions">
          <button class="btn btn-secondary btn-small" onclick="CoachFormulesPage.modifier('${f.id}')">✏️ Modifier</button>
          <button class="btn btn-secondary btn-small" onclick="CoachFormulesPage.basculer('${f.id}')">${f.actif ? 'Retirer' : 'Remettre'}</button>
        </td>
      </tr>`;
    document.getElementById('foContent').innerHTML = `
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <span>Formules d'abonnement</span>
          ${this._edition ? '' : `<button class="btn btn-primary btn-small" onclick="CoachFormulesPage.modifier('nouvelle')">+ Nouvelle formule</button>`}
        </div>
        <div style="font-size:12px;color:var(--gray-light);margin-bottom:10px;">
          Choisie sur la fiche d'un client (onglet Facturation), une formule remplit son montant mensuel, qui reste modifiable pour lui.
          Le prix par séance des clients à la consommation se saisit directement sur leur fiche.
        </div>
        <table class="fo-table">
          <tbody>
            ${this._edition === 'nouvelle' ? this._formulaire(null) : ''}
            ${actives.map(ligne).join('')}
            ${!actives.length && this._edition !== 'nouvelle' ? '<tr><td colspan="4" class="fo-vide">Aucune formule pour l\'instant.</td></tr>' : ''}
          </tbody>
        </table>
        ${retirees.length ? `
          <div class="fo-sous-titre">Retirées du catalogue</div>
          <table class="fo-table"><tbody>${retirees.map(ligne).join('')}</tbody></table>` : ''}
      </div>`;
    document.getElementById('foNom')?.focus();
  },

  modifier(id) { this._edition = id; this._render(); },
  annuler() { this._edition = null; this._render(); },

  async enregistrer() {
    const nom = document.getElementById('foNom').value.trim();
    const prix = document.getElementById('foPrix').value;
    const duree = document.getElementById('foDuree').value;
    const err = document.getElementById('foErreur');
    if (!nom || prix === '' || Number(prix) < 0) {
      err.innerHTML = '<div class="alert alert-error" style="margin-top:8px;">Indique un nom et un prix.</div>';
      return;
    }
    const avant = this.formules.find(f => f.id === this._edition);
    try {
      const f = await db.saveFormule({ id: avant?.id, nom, prix_mensuel: Number(prix),
        duree_mois: duree ? parseInt(duree, 10) : null, actif: avant ? avant.actif : true });
      this.formules = avant ? this.formules.map(x => x.id === f.id ? f : x) : [...this.formules, f];
      this.formules.sort((a, b) => (b.actif - a.actif) || a.nom.localeCompare(b.nom, 'fr'));
      this._edition = null;
      this._render();
      toast('Formule enregistrée');
    } catch (e) {
      err.innerHTML = '<div class="alert alert-error" style="margin-top:8px;">' + escHtml(e.message) + '</div>';
    }
  },

  async basculer(id) {
    const f = this.formules.find(x => x.id === id);
    if (!f) return;
    if (f.actif && !confirm(`Retirer « ${f.nom} » du catalogue ?\n\nElle ne sera plus proposée. Les clients qui l'ont déjà gardent leur montant.`)) return;
    try {
      const maj = await db.saveFormule({ ...f, actif: !f.actif });
      this.formules = this.formules.map(x => x.id === id ? maj : x);
      this._render();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  },
};
