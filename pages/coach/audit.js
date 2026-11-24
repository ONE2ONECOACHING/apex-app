// APEX APP — Audit du bilan d'un lead (route coach-audit?id=<audit>)
// Lecture de l'audit rédigé par Claude, impression / PDF, réponses brutes du
// questionnaire, relance de la rédaction. Gérants (et référent une fois client).

const CoachAuditPage = {
  audit: null,
  lead: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="au-barre">
        <button class="btn btn-secondary btn-small" onclick="history.length > 1 ? history.back() : (window.location.hash = '#coach-crm')">‹ Retour</button>
        <div class="au-barre-actions" id="auActions"></div>
      </div>
      <div id="auContenu"><div class="loading"><div class="spinner"></div></div></div>`;
  },

  async init() {
    const { id } = Router.getParams();
    if (!id) { window.location.hash = '#coach-crm'; return; }
    const jeton = this._jeton = {};
    try {
      const audit = await db.getAudit(id);
      const { data: lead } = await getSupabase().from('leads').select('id, prenom, nom').eq('id', audit.lead_id).maybeSingle();
      if (jeton !== this._jeton) return;
      this.audit = audit;
      this.lead = lead || {};
      this._afficher();
    } catch (e) {
      if (jeton !== this._jeton) return;
      document.getElementById('auContenu').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _afficher() {
    const a = this.audit, l = this.lead;
    const gerant = Router.userProfile?.is_gerant;
    document.getElementById('auActions').innerHTML = `
      ${a.statut === 'pret' ? '<button class="btn btn-primary btn-small" onclick="window.print()">🖨 PDF / Imprimer</button>' : ''}
      ${gerant && a.reponses ? `<button class="btn btn-secondary btn-small" onclick="CoachAuditPage.refaire()">↻ Refaire l'audit</button>` : ''}`;

    let corps = '';
    if (a.statut === 'pret') {
      corps = auditAVerifierHTML(a.contenu) + auditHTML(a.contenu, { prenom: l.prenom, nom: l.nom, date: a.rempli_le });
    } else if (a.statut === 'en_cours') {
      corps = `<div class="card"><b>Audit en cours de rédaction…</b><p style="color:var(--gray);margin:6px 0 0">Compte une à deux minutes. Une notification arrive quand il est prêt.</p></div>`;
    } else if (a.statut === 'erreur') {
      corps = `<div class="alert alert-error">L'audit n'a pas pu être rédigé : ${escHtml(a.erreur || 'erreur inconnue')}</div>`;
    } else {
      corps = `<div class="card">Le questionnaire n'a pas encore été rempli.</div>`;
    }
    const reponses = (a.reponses || []);
    if (reponses.length) {
      let sec = '';
      corps += `<details class="au-reponses"><summary>Réponses du questionnaire</summary>
        ${reponses.map(r => {
          const titre = r.section !== sec ? `<h3>${escHtml(sec = r.section)}</h3>` : '';
          return `${titre}<div class="au-rep"><div class="au-rep-q">${escHtml(r.question)}</div><div class="au-rep-r">${r.reponse ? escHtml(r.reponse) : '<span style="color:var(--gray)">—</span>'}</div></div>`;
        }).join('')}</details>`;
    }
    document.getElementById('auContenu').innerHTML = corps;
  },

  async refaire() {
    if (!confirm('Refaire rédiger cet audit ? L\'audit actuel sera remplacé (compte environ 0,15 €).')) return;
    try {
      await db.regenererAudit(this.audit.id);
      this.audit.statut = 'en_cours';
      this._afficher();
      toast('Rédaction relancée : une notification arrive quand c\'est prêt.');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  },
};
