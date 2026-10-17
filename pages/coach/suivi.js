// APEX APP — Coach : suivi de la semaine (menu « Suivi »)
// Une ligne par client suivi (studio + suivi, à distance) : où en est son
// journal de suivi cette semaine, son dernier bilan, ses messages non lus.
// À faire en haut (retards d'abord), faits en bas. Un clic ouvre le journal de
// suivi, qui propose ensuite « Client suivant ».

// État de la semaine d'un client (partagé avec le compteur du menu)
const SuiviSemaine = {
  etat(c) {
    const nb = [].concat(c.journal_suivi_entete || [])[0]?.nb_semaines || 26;
    // Semaine à traiter : la semaine dernière (bilan envoyé le samedi)
    const cible = JournalSuivi.aTraiter();
    const semaines = JournalSuivi.semaines(c.date_debut, nb);
    if (!semaines.length) return { cle: 'sans_date', k: 0, nb, retard: 0 };
    const parSemaine = new Map((c.journal_suivi || []).map(l => [l.semaine, l]));
    const k = semaines.find(s => s.lundi === cible)?.k ?? (cible < semaines[0].lundi ? 0 : nb + 1);
    if (k === 0) return { cle: 'a_venir', k, nb, retard: 0 };
    if (k > nb) return { cle: 'termine', k: nb, nb, retard: 0 };
    // Retard : même règle que le tableau de bord et la page Clients (2 semaines)
    const retard = JournalSuivi.semainesEnRetard(c.date_debut, nb, c.journal_suivi);
    if (parSemaine.get(cible)?.fait) return { cle: 'fait', k, nb, retard: 0 };
    return { cle: retard >= 2 ? 'retard' : 'a_faire', k, nb, retard };
  },

  aFaire(e) { return ['retard', 'a_faire', 'sans_date'].includes(e.cle); },
};

// Compteur du menu : mes suivis à faire cette semaine (relu au plus toutes les 2 min)
let _compteurSuivi = { n: 0, le: 0 };
async function rafraichirCompteurSuivi() {
  const moi = Router.userProfile;
  if (!moi || moi.role !== 'coach') return;
  if (Date.now() - _compteurSuivi.le > 120000) {
    const suivis = await db.getSuivisPourRetards().catch(() => null);
    if (suivis) _compteurSuivi = {
      n: suivis.filter(c => c.coach_referent_id === moi.id && SuiviSemaine.aFaire(SuiviSemaine.etat(c))).length,
      le: Date.now(),
    };
  }
  document.querySelectorAll('[data-compteur-suivi]').forEach(el => {
    el.textContent = String(_compteurSuivi.n);
    el.hidden = !_compteurSuivi.n;
  });
}

const CoachSuiviPage = {
  lignes: [],
  coachs: [],
  _coach: null,

  render() {
    document.body.classList.add('coach-wide');
    const lundi = new Date(JournalSuivi.aTraiter() + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Suivi de la semaine</div>
          <div class="su-sous">À traiter : semaine du ${lundi} (bilan du samedi)</div>
        </div>
        <div id="suCoach"></div>
      </div>
      <div id="suContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const moi = Router.userProfile;
    if (!moi || moi.role !== 'coach') { window.location.hash = '#login'; return; }
    this._coach = this._coach || moi.id;
    try {
      const cible = JournalSuivi.aTraiter();
      const depuis = cible;
      const [suivis, bilans, resume, coachs] = await Promise.all([
        db.getSuivisPourRetards(),
        db.getBilansRecents(depuis).catch(() => []),
        db.getConversationsResume().catch(() => []),
        moi.is_gerant ? db.getCoachs().catch(() => []) : Promise.resolve([]),
      ]);
      this.coachs = coachs.filter(c => c.id !== COMPTE_PARTAGE_ID);
      const nonLus = new Map(resume.filter(r => r.canal === 'suivi').map(r => [r.client_id, Number(r.non_lus || 0)]));
      this.lignes = suivis.map(c => ({
        client: c,
        etat: SuiviSemaine.etat(c),
        bilan: bilans.find(b => b.client_id === c.id && b.semaine === cible) || null,   // bilan de la semaine à traiter
        nonLus: c.coach_referent_id === moi.id ? (nonLus.get(c.id) || 0) : 0,
      }));
      // Le compteur du menu suit ce qu'on vient de lire
      _compteurSuivi = { n: this.lignes.filter(l => l.client.coach_referent_id === moi.id && SuiviSemaine.aFaire(l.etat)).length, le: Date.now() };
      rafraichirCompteurSuivi();
      if (moi.is_gerant) {
        document.getElementById('suCoach').innerHTML = `
          <select class="input su-select" onchange="CoachSuiviPage._coach=this.value;CoachSuiviPage._render()">
            ${this.coachs.map(c => `<option value="${c.id}" ${c.id === this._coach ? 'selected' : ''}>${escHtml(`${c.prenom || ''} ${c.nom || ''}`.trim())}</option>`).join('')}
          </select>`;
      }
      this._render();
    } catch (e) {
      document.getElementById('suContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _nom(c) { return `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Client'; },

  // Ordre de traitement : plus gros retards, puis sans date, puis à faire ; ensuite les faits
  _ordre(l) {
    const e = l.etat;
    return e.cle === 'retard' ? 100 - e.retard : e.cle === 'sans_date' ? 200 : e.cle === 'a_faire' ? 300
      : e.cle === 'fait' ? 400 : e.cle === 'a_venir' ? 500 : 600;
  },

  _render() {
    const lignes = this.lignes
      .filter(l => l.client.coach_referent_id === this._coach)
      .sort((a, b) => this._ordre(a) - this._ordre(b) || this._nom(a.client).localeCompare(this._nom(b.client)));
    const aFaire = lignes.filter(l => SuiviSemaine.aFaire(l.etat));
    const faits = lignes.filter(l => !SuiviSemaine.aFaire(l.etat));
    // File d'attente pour « Client suivant » dans le journal de suivi
    try { sessionStorage.setItem('suiviFile', JSON.stringify(aFaire.map(l => ({ id: l.client.id, nom: this._nom(l.client) })))); } catch (_) {}

    const journal = e => ({
      retard: `<span class="su-pill rouge">Retard ${e.retard} sem.</span>`,
      a_faire: '<span class="su-pill gris">À faire</span>',
      sans_date: '<span class="su-pill orange">Date de début à régler</span>',
      fait: '<span class="su-pill vert">Fait</span>',
      a_venir: '<span class="su-pill gris">Pas encore commencé</span>',
      termine: '<span class="su-pill gris">Suivi terminé</span>',
    })[e.cle];
    const bilan = b => !b ? '<span class="su-vide">—</span>'
      : b.statut !== 'complete' ? '<span class="su-pill gris">En attente</span>'
      : b.coach_lu === false ? '<span class="su-pill orange">À lire</span>' : '<span class="su-pill vert">Lu</span>';
    const ligne = l => `
      <div class="su-ligne ${SuiviSemaine.aFaire(l.etat) ? '' : 'faite'}" onclick="CoachSuiviPage.ouvrir('${l.client.id}')">
        <div class="su-client">
          <div class="su-nom">${escHtml(this._nom(l.client))}</div>
          <div class="su-sous">${l.etat.k ? `sem. ${l.etat.k}/${l.etat.nb}` : ''}</div>
        </div>
        <div data-label="Journal">${journal(l.etat)}</div>
        <div data-label="Bilan">${bilan(l.bilan)}</div>
        <div data-label="Messages">${l.nonLus ? `<span class="msg-badge">${l.nonLus}</span>` : '<span class="su-vide">—</span>'}</div>
        <span class="su-fleche">›</span>
      </div>`;

    document.getElementById('suContent').innerHTML = lignes.length ? `
      <div class="su-resume">${aFaire.length} à faire · ${faits.filter(l => l.etat.cle === 'fait').length} fait${faits.filter(l => l.etat.cle === 'fait').length > 1 ? 's' : ''} sur ${lignes.length} client${lignes.length > 1 ? 's' : ''} suivi${lignes.length > 1 ? 's' : ''}</div>
      <div class="su-cadre">
        <div class="su-ligne su-tete"><div>À faire</div><div>Journal de suivi</div><div>Bilan</div><div>Messages</div><span></span></div>
        ${aFaire.map(ligne).join('') || '<div class="su-bravo">Tous les suivis de la semaine sont faits.</div>'}
        ${faits.length ? `<div class="su-ligne su-tete su-groupe"><div>Déjà faits</div><div></div><div></div><div></div><span></span></div>${faits.map(ligne).join('')}` : ''}
      </div>`
      : '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Aucun client suivi.</div></div>';
  },

  ouvrir(clientId) {
    Router.navigate('coach-journal-suivi', { clientId, depuisSuivi: true });
  },
};

// Barre « ‹ Suivi · Client suivant › » en haut du journal de suivi ouvert depuis l'onglet Suivi
function barreSuiviSuivant(clientId) {
  let file = [];
  try { file = JSON.parse(sessionStorage.getItem('suiviFile') || '[]'); } catch (_) {}
  const i = file.findIndex(x => x.id === clientId);
  const suivant = file.slice(i + 1).find(x => x.id !== clientId) || (i < 0 ? file[0] : null);
  return `
    <div class="su-barre">
      <button class="btn btn-secondary btn-small" onclick="window.location.hash='#coach-suivi'">‹ Suivi</button>
      <div class="su-barre-centre">${i >= 0 ? `${i + 1} sur ${file.length} à faire` : 'Suivi de la semaine'}</div>
      ${suivant ? `<button class="btn btn-primary btn-small" onclick="CoachSuiviPage.ouvrir('${suivant.id}')">Suivant : ${escHtml(suivant.nom.split(' ')[0])} ›</button>`
        : '<span class="su-barre-fin">Dernier client</span>'}
    </div>`;
}
