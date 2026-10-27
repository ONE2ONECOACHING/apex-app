// APEX APP — Gérant : facturation du mois
// Une ligne par client : abonnement + séances facturées × prix par séance.
// Séances facturées = coachings présents dans l'agenda ce mois-ci (un créneau
// supprimé n'est pas facturé, une annulation tardive reste dans l'agenda) :
//   consommation → tous ; mixte → seulement « en plus » ; abonnement → aucun.
// Montants calculés avec les tarifs actuels des clients (pas d'historique figé).

const CoachFacturationPage = {
  mois: null,          // Date du 1er du mois affiché

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · GÉRANT</div>
          <div class="app-title">Facturation du mois</div>
        </div>
      </div>
      <div class="fa-mois">
        <button class="btn btn-secondary btn-small" onclick="CoachFacturationPage.changerMois(-1)">‹</button>
        <span id="faMois"></span>
        <button class="btn btn-secondary btn-small" onclick="CoachFacturationPage.changerMois(1)">›</button>
      </div>
      <div id="faContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  init() {
    const me = Router.userProfile;
    if (!me || me.role !== 'coach' || !me.is_gerant) { window.location.hash = '#coach-accueil'; return; }
    const auj = new Date();
    this.mois = new Date(auj.getFullYear(), auj.getMonth(), 1);
    this._charger();
  },

  changerMois(sens) {
    this.mois = new Date(this.mois.getFullYear(), this.mois.getMonth() + sens, 1);
    this._charger();
  },

  async _charger() {
    const jeton = this._jeton = {};
    const debut = this.mois;
    const fin = new Date(debut.getFullYear(), debut.getMonth() + 1, 1);
    const titre = debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    document.getElementById('faMois').textContent = titre.charAt(0).toUpperCase() + titre.slice(1);
    document.getElementById('faContent').innerHTML = '<div class="spinner" style="margin-top:2rem;"></div>';
    try {
      const [clients, factus, formules, coachings, suppressions, coachs] = await Promise.all([
        db.getClientsFacturation(), db.getFacturationsClients(), db.getFormules(),
        db.getCoachingsPeriode(debut.toISOString(), fin.toISOString()),
        db.getSuppressionsPeriode(debut.toISOString(), fin.toISOString()),
        db.getCoachs(),
      ]);
      if (jeton !== this._jeton) return;
      this._render({ clients, factus, formules, coachings, suppressions, coachs, debut, fin });
    } catch (e) {
      if (jeton !== this._jeton) return;
      document.getElementById('faContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _lignes({ clients, factus, formules, coachings, fin }) {
    const maintenant = new Date();
    const finMois = new Date(fin.getTime() - 864e5).toLocaleDateString('sv-SE');
    const factuPar = new Map(factus.map(f => [f.client_id, f]));
    const formulePar = new Map(formules.map(f => [f.id, f]));
    const seancesPar = new Map();
    for (const c of coachings) {
      if (!seancesPar.has(c.client_id)) seancesPar.set(c.client_id, []);
      seancesPar.get(c.client_id).push(c);
    }
    const lignes = [], aCompleter = [];
    for (const cl of clients) {
      const f = factuPar.get(cl.id) || {};
      const toutes = seancesPar.get(cl.id) || [];
      const mode = cl.mode_facturation || '';
      const abo = (mode === 'abonnement' || mode === 'mixte') && cl.actif !== false
        && (!f.debut_abonnement || f.debut_abonnement <= finMois);
      const facturees = mode === 'consommation' ? toutes : mode === 'mixte' ? toutes.filter(c => c.en_plus) : [];
      const nom = `${cl.prenom || ''} ${cl.nom || ''}`.trim() || 'Client';
      if (!mode) {
        if (cl.actif !== false || toutes.length) aCompleter.push({ cl, nom, raison: 'Mode de facturation pas choisi', nb: toutes.length });
        continue;
      }
      if (!abo && !facturees.length) continue;
      const manque = [abo && f.montant_abonnement == null && 'montant par mois',
                      facturees.length && f.prix_seance == null && 'prix par séance'].filter(Boolean);
      if (manque.length) { aCompleter.push({ cl, nom, raison: 'Manque : ' + manque.join(', '), nb: toutes.length }); continue; }
      const montantAbo = abo ? Number(f.montant_abonnement) : 0;
      const montantSeances = facturees.length * Number(f.prix_seance || 0);
      lignes.push({
        cl, nom, mode, formule: formulePar.get(f.formule_id)?.nom, montantAbo, abo,
        nb: facturees.length, aVenir: facturees.filter(c => new Date(c.debut) > maintenant).length,
        incluses: mode === 'abonnement' ? toutes.length : mode === 'mixte' ? toutes.length - facturees.length : 0,
        prix: Number(f.prix_seance || 0), montantSeances, total: montantAbo + montantSeances,
      });
    }
    return { lignes, aCompleter };
  },

  _render(d) {
    const { lignes, aCompleter } = this._lignes(d);
    const modes = { abonnement: 'Abonnement', consommation: 'Consommation', mixte: 'Mixte' };
    const total = lignes.reduce((s, l) => s + l.total, 0);
    const totalAbo = lignes.reduce((s, l) => s + l.montantAbo, 0);
    const totalSeances = lignes.reduce((s, l) => s + l.montantSeances, 0);
    const aVenir = lignes.reduce((s, l) => s + l.aVenir, 0);
    const fiche = id => `Router.navigate('coach-client-facturation',{clientId:'${id}'})`;
    const coachNom = id => { const c = d.coachs.find(x => x.id === id); return c ? (c.prenom || c.nom || '') : ''; };
    const heure = iso => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    document.getElementById('faContent').innerHTML = `
      <div class="fa-totaux">
        <div class="fa-total"><div class="fa-total-val">${euros(total)}</div><div class="fa-total-lib">Total du mois</div></div>
        <div class="fa-total"><div class="fa-total-val">${euros(totalAbo)}</div><div class="fa-total-lib">Abonnements</div></div>
        <div class="fa-total"><div class="fa-total-val">${euros(totalSeances)}</div><div class="fa-total-lib">Séances à la consommation</div></div>
      </div>
      ${aVenir ? `<div class="cf-aide" style="margin-bottom:10px;">Dont ${aVenir} séance${aVenir > 1 ? 's' : ''} encore à venir ce mois-ci (comptée${aVenir > 1 ? 's' : ''} comme prévue${aVenir > 1 ? 's' : ''}).</div>` : ''}

      <div class="card" style="padding:0;overflow-x:auto;">
        <table class="fa-table">
          <thead><tr><th>Client</th><th>Mode</th><th class="num">Abonnement</th><th class="num">Séances</th><th class="num">Total</th></tr></thead>
          <tbody>
            ${lignes.map(l => `
              <tr class="fa-ligne" onclick="${fiche(l.cl.id)}">
                <td><div class="fa-nom">${escHtml(l.nom)}</div>${l.cl.actif === false ? '<div class="fa-sous">inactif</div>' : ''}</td>
                <td>${modes[l.mode]}${l.formule ? `<div class="fa-sous">${escHtml(l.formule)}</div>` : ''}</td>
                <td class="num">${l.abo ? euros(l.montantAbo) : '—'}${l.incluses ? `<div class="fa-sous">${l.incluses} séance${l.incluses > 1 ? 's' : ''} incluse${l.incluses > 1 ? 's' : ''}</div>` : ''}</td>
                <td class="num">${l.nb ? `${l.nb} × ${euros(l.prix)}<div class="fa-sous">${euros(l.montantSeances)}${l.aVenir ? ` · ${l.aVenir} à venir` : ''}</div>` : '—'}</td>
                <td class="num fa-tot">${euros(l.total)}</td>
              </tr>`).join('') || '<tr><td colspan="5" class="fo-vide">Rien à facturer ce mois-ci.</td></tr>'}
          </tbody>
        </table>
      </div>

      ${aCompleter.length ? `
        <details class="card fa-details" ${aCompleter.some(a => a.nb) ? 'open' : ''}>
          <summary>À compléter (${aCompleter.length})${aCompleter.some(a => a.nb) ? ` · dont ${aCompleter.filter(a => a.nb).length} avec des séances ce mois-ci` : ''}</summary>
          ${aCompleter.sort((a, b) => b.nb - a.nb || a.nom.localeCompare(b.nom, 'fr')).map(a => `
            <div class="fa-acompleter" onclick="${fiche(a.cl.id)}">
              <span class="fa-nom">${escHtml(a.nom)}</span>
              <span class="fa-sous">${a.raison}${a.nb ? ` · ${a.nb} séance${a.nb > 1 ? 's' : ''} ce mois-ci` : ''}</span>
            </div>`).join('')}
        </details>` : ''}

      <details class="card fa-details">
        <summary>Créneaux supprimés du mois (${d.suppressions.length})</summary>
        ${d.suppressions.length ? `<table class="fa-table">
          <thead><tr><th>Séance prévue</th><th>Client</th><th>Coach</th><th>Supprimé</th></tr></thead>
          <tbody>${d.suppressions.map(s => `
            <tr><td>${heure(s.debut)}</td><td>${escHtml(s.client_nom || '—')}</td><td>${escHtml(coachNom(s.coach_id))}</td>
              <td>${heure(s.supprime_le)}${s.supprime_par ? ` par ${escHtml(coachNom(s.supprime_par) || '—')}` : ''}</td></tr>`).join('')}
          </tbody></table>` : '<div class="fo-vide">Aucun créneau supprimé ce mois-ci.</div>'}
      </details>`;
  },
};
