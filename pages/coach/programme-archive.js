// APEX APP — Coach : programme archivé d'un client (lecture seule)
// Séances du programme et charges réellement utilisées, séance après séance :
// séances à distance d'après le journal d'entraînement du client, séances au
// studio par leur grille. Le client ne voit pas ses programmes archivés.

const CoachProgrammeArchivePage = {
  prog: null,
  clientId: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="paTitre">Programme archivé</div>
        </div>
      </div>
      <div id="paNav"></div>
      <div id="paContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const params = Router.getParams();
    if (!params.clientId || !params.progId) { window.location.hash = '#coach-clients'; return; }
    this.clientId = params.clientId;
    document.getElementById('paNav').innerHTML = coachClientNav(params.clientId, 'coach-client-programme');
    try {
      const prog = await db.getClientProgrammeById(params.progId);
      if (!prog) throw new Error('Programme introuvable.');
      this.prog = prog;
      // Séances comptées depuis la plus récente de la date de début et de l'attribution
      const depuis = [prog.date_debut, (prog.created_at || '').slice(0, 10)].filter(Boolean).sort().pop()
        || '2000-01-01';
      const logs = await db.getSeancesLogDepuis(params.clientId, depuis);
      this._render(logs, depuis);
    } catch (e) {
      document.getElementById('paContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  // Séances faites de cette séance du programme : reliées par seance_id, ou, pour les
  // anciennes (avant le 12 octobre 2026), par le même nom pendant la durée du programme
  _logsSeance(s, logs, depuis) {
    const fin = new Date(new Date(depuis).getTime() + ((this.prog.nb_semaines || 4) + 4) * 7 * 864e5)
      .toISOString().slice(0, 10);
    return logs.filter(l => l.seance_id === s.id
      || (!l.seance_id && l.nom_seance === s.nom && l.date_seance <= fin));
  },

  // Séries d'un exercice dans une séance faite : « 10×40 · 10×42,5 »
  _series(log, ex) {
    const ligne = (log.seances_log_sets || []).find(x => x.client_prog_exercice_id === ex.id)
      || (log.seances_log_sets || []).find(x => !x.client_prog_exercice_id && x.exercice_id === ex.exercice_id);
    const sets = ligne?.sets_data || [];
    if (!sets.length) return '<span class="pa-vide">—</span>';
    const kg = v => String(v).replace('.', ',');
    return sets.map(x => {
      if (x.charge && x.reps) return `${escHtml(String(x.reps))}×${escHtml(kg(x.charge))}`;
      if (x.charge) return `${escHtml(kg(x.charge))} kg`;
      return escHtml(String(x.reps || '—'));
    }).join('<br>');
  },

  _render(logs, depuis) {
    const p = this.prog;
    const date = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    document.getElementById('paTitre').textContent = p.nom;

    const seances = (p.seances || []).map(s => {
      if (s.cardio) return `
        <div class="card pa-seance">
          <div class="pa-seance-nom">🏃 ${escHtml(s.nom)} <span class="pa-sous">cardio</span></div>
        </div>`;
      if (s.lieu === 'studio') return `
        <div class="card pa-seance">
          <div class="pa-seance-tete">
            <div class="pa-seance-nom">📌 ${escHtml(s.nom)} <span class="pa-sous">au studio</span></div>
            <button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-seance-studio',{seanceId:'${s.id}',clientId:'${this.clientId}'})">📋 Voir la grille</button>
          </div>
        </div>`;
      const faites = this._logsSeance(s, logs, depuis);
      const exos = s.exercices || [];
      return `
        <div class="card pa-seance">
          <div class="pa-seance-nom">📌 ${escHtml(s.nom)} <span class="pa-sous">à distance · faite ${faites.length} fois</span></div>
          ${faites.length && exos.length ? `
          <div class="pa-defile">
            <table class="pa-table">
              <thead><tr><th>Exercice</th>${faites.map(l => `<th>${new Date(l.date_seance).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</th>`).join('')}</tr></thead>
              <tbody>${exos.map(ex => `
                <tr>
                  <td class="pa-exo">${escHtml(ex.exercices_bdd?.nom || '—')}</td>
                  ${faites.map(l => `<td>${this._series(l, ex)}</td>`).join('')}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="pa-legende">Répétitions × charge (kg), une ligne par série.</div>`
          : `<div class="pa-sous" style="margin-top:6px;">Aucune séance enregistrée par le client.</div>`}
        </div>`;
    }).join('');

    document.getElementById('paContent').innerHTML = `
      <div class="card pa-entete">
        <div>
          <div class="pa-archive">Archivé</div>
          <div class="pa-sous">Débuté le ${date(p.date_debut || p.created_at)} · ${p.nb_semaines || 4} semaines · ${(p.seances || []).length} séance${(p.seances || []).length > 1 ? 's' : ''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-client-programme',{clientId:'${this.clientId}'})">‹ Programmes</button>
          <button class="btn btn-secondary btn-small" onclick="CoachProgrammeArchivePage.reactiver()">Réactiver</button>
        </div>
      </div>
      ${seances || '<div class="card">Aucune séance.</div>'}`;
  },

  async reactiver() {
    if (!confirm(`Réactiver « ${this.prog.nom} » ?\n\nIl redevient un programme en cours : le client le voit à nouveau.`)) return;
    try {
      await db.reactiverClientProgramme(this.prog.id);
      toast('Programme réactivé', 'success');
      Router.navigate('coach-client-programme', { clientId: this.clientId });
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },
};
