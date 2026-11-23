// APEX APP — Gérants : CRM (leads)
// Les leads Meta arrivent par Make (Edge Function lead-entrant) ; ceux
// d'Instagram ou d'ailleurs s'ajoutent à la main (« + Lead »).
// Nouveaux = personne ne s'en occupe encore (visibles des deux gérants) ;
// « Je le prends » les range dans « Mes leads » du gérant.
// Parcours : à contacter (appel 1 + vocal, appel 2 + SMS le même jour, appel 3
// le lendemain) → setting (a répondu) → RDV studio (créneau prospect dans
// l'agenda) → venu → vente (formule, puis création du client) ;
// ou perdu (pas de vente, avec un motif) ; ou pas de réponse après l'appel 3.
// Rappel programmé : notification au responsable à l'heure dite (rappel-coaching).

// Compteur du menu « Leads » (gérants) : nouveaux leads sans responsable +
// mes leads dont la relance ou le rappel tombe aujourd'hui (comme le bloc
// « Leads à traiter » du tableau de bord). Relu au plus toutes les minutes ;
// l'écran Leads le recalcule lui-même à chaque changement.
let _compteurLeads = { n: 0, le: 0 };
function _nbLeadsATraiter(leads, moiId) {
  const fin = new Date(); fin.setHours(23, 59, 59, 999);
  return leads.filter(l => ['a_contacter', 'setting', 'rdv'].includes(l.etape) && (!l.responsable_id
    || l.responsable_id === moiId && CRM.echeance(l) && new Date(CRM.echeance(l)) <= fin)).length;
}
function _afficherCompteurLeads() {
  document.querySelectorAll('[data-compteur-leads]').forEach(el => {
    el.textContent = String(_compteurLeads.n);
    el.hidden = !_compteurLeads.n;
  });
}
async function rafraichirCompteurLeads() {
  const moi = Router.userProfile;
  if (!moi || moi.role !== 'coach' || !moi.is_gerant) return;
  if (Date.now() - _compteurLeads.le > 60000) {
    const leads = await db.getLeadsDuJour(moi.id).catch(() => null);
    if (leads) _compteurLeads = { n: leads.length, le: Date.now() };
  }
  _afficherCompteurLeads();
}

const CRM = {
  ETAPES: [
    { id: 'a_contacter', label: 'À contacter' },
    { id: 'setting',     label: 'Setting' },
    { id: 'rdv',         label: 'RDV studio' },
    { id: 'venu',        label: 'Venu' },
    { id: 'vente',       label: 'Vente' },
  ],
  CLOS: { vente: 'Vente', perdu: 'Perdu', sans_reponse: 'Pas de réponse' },
  RELANCES: ['Appel 1 + message vocal', 'Appel 2 + SMS', 'Appel 3'],
  CHALEUR: [
    'Pas qualifié : curieux, cherche juste, pas vraiment intéressé',
    'Mou, ne semble pas avoir le budget, pas très chaud',
    'Peut être intéressé, mais il manque des conditions (disponibilités et/ou budget)',
    'Chaud : veut ce qu\'on propose, a le budget, tous les voyants au vert',
  ],

  enCours: l => ['a_contacter', 'setting', 'rdv', 'venu'].includes(l.etape),

  // Date de la prochaine chose à faire (rappel programmé d'abord)
  echeance(l) {
    if (l.rappel_le) return l.rappel_le;
    if (l.etape === 'a_contacter') return l.prochaine_le || l.cree_le;
    if (l.etape === 'rdv') return l.rdv_le;
    if (l.etape === 'setting') return l.setting_le || l.cree_le;
    return null;
  },

  // Ce qu'il y a à faire, en quelques mots
  aFaire(l) {
    if (l.rappel_le) return `Rappel ${CRM.quand(l.rappel_le)}`;
    if (l.etape === 'a_contacter') return `${CRM.RELANCES[l.relances] || 'Appel'} · ${CRM.quand(l.prochaine_le || l.cree_le)}`;
    if (l.etape === 'setting') return 'Setting : proposer un RDV studio';
    if (l.etape === 'rdv') return `RDV studio ${CRM.quand(l.rdv_le)}`;
    if (l.etape === 'venu') return 'Venu : vente ou perdu ?';
    return CRM.CLOS[l.etape] || '';
  },

  nom: l => `${l.prenom || ''} ${l.nom || ''}`.trim() || l.email || l.telephone || 'Sans nom',

  // « aujourd'hui 18:00 », « demain 10:00 », « lun. 24 nov. 18:00 », « en retard »
  quand(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const j0 = new Date(); j0.setHours(0, 0, 0, 0);
    const jours = Math.floor((new Date(d).setHours(0, 0, 0, 0) - j0) / 864e5);
    if (jours === 0) return d <= new Date() ? `maintenant (${hm})` : `aujourd'hui ${hm}`;
    if (jours === 1) return `demain ${hm}`;
    if (jours < 0) return `en retard (${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})`;
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + hm;
  },

  // Lien WhatsApp : 06… → 336…
  whatsapp(tel) {
    let n = String(tel || '').replace(/[^\d+]/g, '');
    if (n.startsWith('+')) n = n.slice(1);
    else if (n.startsWith('00')) n = n.slice(2);
    else if (n.startsWith('0')) n = '33' + n.slice(1);
    return n ? `https://wa.me/${n}` : '';
  },
};

// Date et heure : une case date + deux menus (heure, minutes). Safari n'a pas
// de sélecteur d'heure pour <input type="datetime-local">.
const crmDeux = n => String(n).padStart(2, '0');
function crmChampDateHeure(id, d, pas = 5) {
  const m = Math.round(d.getMinutes() / pas) * pas;
  const date = new Date(d); date.setMinutes(0, 0, 0);
  if (m >= 60) date.setHours(date.getHours() + 1);
  const h = date.getHours(), min = m % 60;
  const ymd = `${date.getFullYear()}-${crmDeux(date.getMonth() + 1)}-${crmDeux(date.getDate())}`;
  const heures = []; for (let i = 6; i <= 22; i++) heures.push(i);
  if (!heures.includes(h)) heures.push(h), heures.sort((a, b) => a - b);
  const minutes = []; for (let i = 0; i < 60; i += pas) minutes.push(i);
  return `<div class="crm-dh">
    <input class="input" id="${id}D" type="date" value="${ymd}">
    <select class="input" id="${id}H">${heures.map(x => `<option value="${x}" ${x === h ? 'selected' : ''}>${crmDeux(x)} h</option>`).join('')}</select>
    <select class="input" id="${id}M">${minutes.map(x => `<option value="${x}" ${x === min ? 'selected' : ''}>${crmDeux(x)}</option>`).join('')}</select>
  </div>`;
}
function crmLireDateHeure(id) {
  const ymd = document.getElementById(id + 'D').value;
  if (!ymd) return null;
  const [a, mo, j] = ymd.split('-').map(Number);
  return new Date(a, mo - 1, j, Number(document.getElementById(id + 'H').value), Number(document.getElementById(id + 'M').value));
}
// Remplace les trois champs (boutons « Dans 1 h », « Demain 10:00 »…)
function crmPoserDateHeure(id, iso, pas = 5) {
  const zone = document.getElementById(id + 'D')?.closest('.crm-dh');
  if (zone) zone.outerHTML = crmChampDateHeure(id, new Date(iso), pas);
}

const CoachCrmPage = {
  leads: [],
  gerants: [],
  coachs: [],
  formules: [],
  vue: 'mes',          // mes | nouveaux | tous | vente | perdu | sans_reponse | chiffres
  choisi: null,        // id du lead ouvert
  periode: 'mois',

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · GÉRANTS</div>
          <div class="app-title">Leads</div>
        </div>
        <button class="btn btn-primary btn-small" onclick="CoachCrmPage.nouveau()">+ Lead</button>
      </div>
      <div id="crmVues" class="crm-vues"></div>
      <div id="crmContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="coachModal"></div>`;
  },

  async init() {
    const me = Router.userProfile;
    if (!me || me.role !== 'coach' || !me.is_gerant) { window.location.hash = '#coach-accueil'; return; }
    const jeton = this._jeton = {};
    const q = new URLSearchParams((window.location.hash.split('?')[1]) || '');
    if (q.get('lead')) this.choisi = q.get('lead');
    try {
      const [leads, coachs, formules] = await Promise.all([
        db.getLeads(), db.getCoachs(), db.getFormules().catch(() => []),
      ]);
      if (jeton !== this._jeton) return;
      this.leads = leads;
      this.coachs = coachs.filter(c => c.id !== COMPTE_PARTAGE_ID);
      this.gerants = this.coachs.filter(c => c.is_gerant);
      this.formules = formules;
      // Lead ouvert depuis une notification : afficher la bonne liste
      const l = this.leads.find(x => x.id === this.choisi);
      if (l && q.get('lead')) {
        this.vue = !l.responsable_id && CRM.enCours(l) ? 'nouveaux'
          : CRM.enCours(l) ? (l.responsable_id === me.id ? 'mes' : 'tous') : l.etape;
      }
      this._render();
    } catch (e) {
      if (jeton !== this._jeton) return;
      document.getElementById('crmContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  // ── Listes ────────────────────────────────────────────────────────────────
  _liste(vue) {
    const me = Router.userProfile.id;
    const parEcheance = (a, b) => new Date(CRM.echeance(a) || 8.64e15) - new Date(CRM.echeance(b) || 8.64e15);
    const recents = (a, b) => new Date(b.maj_le) - new Date(a.maj_le);
    switch (vue) {
      case 'mes':      return this.leads.filter(l => CRM.enCours(l) && l.responsable_id === me).sort(parEcheance);
      case 'nouveaux': return this.leads.filter(l => CRM.enCours(l) && !l.responsable_id).sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
      case 'tous':     return this.leads.filter(CRM.enCours).sort(parEcheance);
      default:         return this.leads.filter(l => l.etape === vue).sort(recents);
    }
  },

  _gerant(id) {
    const g = this.coachs.find(c => c.id === id);
    return g ? g.prenom : '';
  },

  _render() {
    const nb = v => this._liste(v).length;
    _compteurLeads = { n: _nbLeadsATraiter(this.leads, Router.userProfile.id), le: Date.now() };
    _afficherCompteurLeads();
    const vues = [['mes', 'Mes leads'], ['nouveaux', 'Nouveaux'], ['tous', 'Tous en cours'],
      ['vente', 'Ventes'], ['perdu', 'Perdus'], ['sans_reponse', 'Pas de réponse'], ['chiffres', '📊 Chiffres']];
    document.getElementById('crmVues').innerHTML = vues.map(([v, t]) => `
      <button class="crm-vue ${this.vue === v ? 'on' : ''}" onclick="CoachCrmPage.changerVue('${v}')">${t}${v === 'chiffres' ? ''
        : ` <span class="crm-nb ${v === 'nouveaux' && nb(v) ? 'alerte' : ''}">${nb(v)}</span>`}</button>`).join('');

    const zone = document.getElementById('crmContent');
    if (this.vue === 'chiffres') { zone.innerHTML = this._chiffres(); return; }

    const liste = this._liste(this.vue);
    const lead = this.leads.find(l => l.id === this.choisi);
    const fin = new Date(); fin.setHours(23, 59, 59, 999);
    const ligne = l => {
      const ech = CRM.echeance(l);
      const urgent = CRM.enCours(l) && ech && new Date(ech) <= fin;
      return `
        <div class="crm-ligne ${l.id === this.choisi ? 'on' : ''}" onclick="CoachCrmPage.ouvrir('${l.id}')">
          <div class="crm-ligne-g">
            <div class="crm-ligne-nom">${escHtml(CRM.nom(l))}${l.chaleur != null ? ` <span class="crm-chaleur c${l.chaleur}">${l.chaleur}</span>` : ''}</div>
            <div class="crm-ligne-sous ${urgent ? 'urgent' : ''}">${escHtml(CRM.aFaire(l))}</div>
          </div>
          <div class="crm-ligne-d">
            <span class="crm-etape e-${l.etape}">${escHtml(this._libelleEtape(l.etape))}</span>
            ${this.vue === 'tous' || !CRM.enCours(l) ? `<span class="crm-qui">${escHtml(this._gerant(l.responsable_id) || 'personne')}</span>` : ''}
          </div>
        </div>`;
    };
    const aFaire = this.vue === 'mes' ? liste.filter(l => new Date(CRM.echeance(l)) <= fin) : [];
    const ensuite = this.vue === 'mes' ? liste.filter(l => !aFaire.includes(l)) : liste;
    const vide = {
      mes: 'Aucun lead en cours. Les nouveaux arrivent dans « Nouveaux ».',
      nouveaux: 'Aucun nouveau lead : tout est pris.',
      tous: 'Aucun lead en cours.',
      vente: 'Aucune vente pour l\'instant.', perdu: 'Aucun lead perdu.', sans_reponse: 'Aucun lead sans réponse.',
    }[this.vue];

    zone.innerHTML = `
      <div class="crm-cols ${lead ? 'avec-fiche' : ''}">
        <div class="crm-liste">
          ${aFaire.length ? `<div class="crm-titre-groupe urgent">À faire aujourd'hui · ${aFaire.length}</div>${aFaire.map(ligne).join('')}` : ''}
          ${aFaire.length && ensuite.length ? '<div class="crm-titre-groupe">Ensuite</div>' : ''}
          ${ensuite.map(ligne).join('')}
          ${liste.length ? '' : `<div class="crm-vide">${vide}</div>`}
        </div>
        <div class="crm-fiche">${lead ? this._fiche(lead) : '<div class="crm-vide">Choisis un lead dans la liste.</div>'}</div>
      </div>`;
  },

  _libelleEtape(e) {
    return (CRM.ETAPES.find(x => x.id === e) || {}).label || CRM.CLOS[e] || e;
  },

  changerVue(v) {
    this.vue = v;
    this.choisi = null;
    this._render();
  },

  ouvrir(id) {
    this.choisi = id;
    this._render();
    if (window.innerWidth < 900) window.scrollTo(0, 0);
  },

  fermer() {
    this.choisi = null;
    this._render();
  },

  // ── Fiche d'un lead ───────────────────────────────────────────────────────
  _fiche(l) {
    const me = Router.userProfile.id;
    const wa = CRM.whatsapp(l.telephone);
    const arrive = new Date(l.cree_le).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const source = l.source === 'meta'
      ? `Meta${l.publicite ? ' · pub « ' + escHtml(l.publicite) + ' »' : ''}${l.ensemble_pub ? ' · ' + escHtml(l.ensemble_pub) : ''}`
      : l.source === 'instagram' ? 'Instagram' : 'Autre';
    const enCours = CRM.enCours(l);
    const idxEtape = CRM.ETAPES.findIndex(e => e.id === l.etape);

    const formulaire = Object.entries(l.formulaire || {}).filter(([, v]) => v !== null && v !== '' && typeof v !== 'object');

    return `
      <button class="crm-retour" onclick="CoachCrmPage.fermer()">‹ Liste</button>
      <div class="crm-entete">
        <div>
          <div class="crm-nom">${escHtml(CRM.nom(l))}</div>
          <div class="crm-contact">
            ${l.telephone ? `<a href="tel:${escHtml(l.telephone.replace(/\s/g, ''))}">📞 ${escHtml(l.telephone)}</a>` : ''}
            ${wa ? `<a href="${escHtml(wa)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
            ${l.email ? `<a href="mailto:${escHtml(l.email)}">✉️ ${escHtml(l.email)}</a>` : ''}
          </div>
          <div class="crm-meta">${source} · arrivé ${escHtml(arrive)}</div>
        </div>
        <div class="crm-resp">
          ${l.responsable_id ? `<select class="input" onchange="CoachCrmPage.attribuer('${l.id}', this.value)">
              ${this.gerants.map(g => `<option value="${g.id}" ${g.id === l.responsable_id ? 'selected' : ''}>${escHtml(g.prenom)}</option>`).join('')}
              <option value="">Personne</option>
            </select>`
            : `<button class="btn btn-primary btn-small" onclick="CoachCrmPage.attribuer('${l.id}', '${me}')">Je le prends</button>`}
        </div>
      </div>

      <div class="crm-chaleurs">
        <span class="crm-label">Chaleur</span>
        ${[0, 1, 2, 3].map(n => `<button class="crm-chaleur-btn c${n} ${l.chaleur === n ? 'on' : ''}" data-info="${escHtml(CRM.CHALEUR[n])}"
          onclick="CoachCrmPage.chaleur('${l.id}', ${n})">${n}</button>`).join('')}
        ${l.chaleur != null ? `<span class="crm-chaleur-txt">${escHtml(CRM.CHALEUR[l.chaleur])}</span>` : ''}
      </div>

      <div class="crm-etapes">
        ${CRM.ETAPES.map((e, i) => `<span class="crm-pas ${e.id === l.etape ? 'on' : (idxEtape >= 0 && i < idxEtape) || l.etape === 'vente' ? 'fait' : ''}">${e.label}</span>`).join('')}
        ${l.etape === 'perdu' || l.etape === 'sans_reponse' ? `<span class="crm-pas perdu">${CRM.CLOS[l.etape]}</span>` : ''}
      </div>

      ${this._actions(l)}

      ${enCours ? this._blocRappel(l) : ''}

      ${formulaire.length ? `<div class="crm-bloc"><div class="crm-label">Formulaire</div>
        ${formulaire.map(([k, v]) => `<div class="crm-form-ligne"><span>${escHtml(k.replace(/_/g, ' '))}</span>${escHtml(String(v))}</div>`).join('')}</div>` : ''}

      <div class="crm-bloc">
        <div class="crm-label">Notes</div>
        <textarea class="input crm-notes" id="crmNotes" rows="3" placeholder="Situation, objectifs, disponibilités…"
          onblur="CoachCrmPage.notes('${l.id}', this.value)">${escHtml(l.notes || '')}</textarea>
      </div>

      ${(l.historique || []).length ? `<div class="crm-bloc"><div class="crm-label">Historique</div>
        ${[...l.historique].reverse().map(h => `<div class="crm-histo"><span>${escHtml(new Date(h.quand).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</span>
          ${escHtml(h.quoi)}${h.qui ? ` <em>· ${escHtml(h.qui)}</em>` : ''}</div>`).join('')}</div>` : ''}`;
  },

  // Boutons selon l'étape
  _actions(l) {
    const id = l.id;
    const perdu = `<button class="btn btn-secondary btn-small crm-perdu" onclick="CoachCrmPage.perdu('${id}')">Perdu</button>`;
    switch (l.etape) {
      case 'a_contacter':
        return `<div class="crm-bloc">
          ${CRM.RELANCES.map((r, i) => `<div class="crm-relance ${i < l.relances ? 'fait' : i === l.relances ? 'courante' : ''}">
            <span class="crm-coche">${i < l.relances ? '✓' : ''}</span>${r}
            <span class="crm-relance-quand">${i < l.relances ? 'pas de réponse' : i === l.relances ? escHtml(CRM.quand(l.prochaine_le || l.cree_le)) : i === 1 ? 'le même jour' : 'le lendemain'}</span>
          </div>`).join('')}
          <div class="crm-boutons">
            <button class="btn btn-secondary btn-small" onclick="CoachCrmPage.pasDeReponse('${id}')">Pas de réponse</button>
            <button class="btn btn-primary btn-small" onclick="CoachCrmPage.aRepondu('${id}')">A répondu → Setting</button>
            ${perdu}
          </div></div>`;
      case 'setting':
        return `<div class="crm-bloc"><div class="crm-aide">A répondu : proposer un rendez-vous au studio, ou programmer un rappel s'il n'est pas disponible.</div>
          <div class="crm-boutons">
            <button class="btn btn-primary btn-small" onclick="CoachCrmPage.rdv('${id}')">📅 Prendre un RDV studio</button>
            ${perdu}
          </div></div>`;
      case 'rdv':
        return `<div class="crm-bloc"><div class="crm-aide">RDV studio <b>${escHtml(new Date(l.rdv_le).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}</b>${l.rdv_creneau_id ? ' · dans l\'agenda' : ''}</div>
          <div class="crm-boutons">
            <button class="btn btn-primary btn-small" onclick="CoachCrmPage.venu('${id}')">✓ Venu</button>
            <button class="btn btn-secondary btn-small" onclick="CoachCrmPage.rdv('${id}')">Déplacer le RDV</button>
            <button class="btn btn-secondary btn-small" onclick="CoachCrmPage.pasVenu('${id}')">Pas venu</button>
            ${perdu}
          </div></div>`;
      case 'venu':
        return `<div class="crm-bloc"><div class="crm-boutons">
            <button class="btn btn-primary btn-small" onclick="CoachCrmPage.vente('${id}')">💶 Vente</button>
            ${perdu}
          </div></div>`;
      case 'vente': {
        const f = this.formules.find(x => x.id === l.formule_id);
        return `<div class="crm-bloc crm-vendu">
          <div>Vente le ${escHtml(new Date(l.vente_le || l.maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }))}${f ? ` · <b>${escHtml(f.nom)}</b> (${escHtml(euros(f.prix_mensuel))} / mois)`
            : l.vente_libelle || l.vente_montant != null ? ` · <b>${escHtml(l.vente_libelle || 'Formule personnalisée')}</b>${l.vente_montant != null ? ` (${escHtml(euros(l.vente_montant))} / ${l.vente_unite === 'seance' ? 'séance' : 'mois'})` : ''}` : ''}</div>
          <div class="crm-boutons">
            ${l.client_id
              ? `<button class="btn btn-primary btn-small" onclick="Router.navigate('coach-client-facturation',{clientId:'${l.client_id}'})">💶 Facturation du client</button>
                 <button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-client-edit',{clientId:'${l.client_id}'})">Fiche client</button>`
              : `<button class="btn btn-primary btn-small" onclick="CoachCrmPage.creerClient('${id}')">👤 Créer le client</button>`}
            <button class="btn btn-secondary btn-small" onclick="CoachCrmPage.vente('${id}')">Changer la formule</button>
          </div></div>`;
      }
      case 'perdu':
      case 'sans_reponse':
        return `<div class="crm-bloc">
          ${l.etape === 'perdu' ? `<div class="crm-label">Pourquoi</div><textarea class="input" rows="2" placeholder="Trop cher, pas le bon moment…"
            onblur="CoachCrmPage.motif('${id}', this.value)">${escHtml(l.motif_perdu || '')}</textarea>`
            : '<div class="crm-aide">Trois appels sans réponse.</div>'}
          <div class="crm-boutons"><button class="btn btn-secondary btn-small" onclick="CoachCrmPage.reprendre('${id}')">↺ Reprendre ce lead</button></div>
        </div>`;
    }
    return '';
  },

  _blocRappel(l) {
    if (l.rappel_le) {
      const passe = new Date(l.rappel_le) <= new Date();
      return `<div class="crm-bloc crm-rappel ${passe ? 'passe' : ''}">⏰ Rappel ${escHtml(CRM.quand(l.rappel_le))}
        <button class="btn btn-secondary btn-small" onclick="CoachCrmPage.rappel('${l.id}')">Changer</button>
        <button class="btn btn-secondary btn-small" onclick="CoachCrmPage.finRappel('${l.id}')">${passe ? '✓ Fait' : 'Annuler'}</button></div>`;
    }
    return `<div class="crm-bloc"><button class="btn btn-secondary btn-small" onclick="CoachCrmPage.rappel('${l.id}')">⏰ Programmer un rappel</button></div>`;
  },

  // ── Enregistrement ────────────────────────────────────────────────────────
  // patch + une ligne d'historique ; met à jour la liste sans tout relire
  async _maj(id, patch, quoi) {
    const l = this.leads.find(x => x.id === id);
    if (!l) return null;
    if (quoi) patch.historique = [...(l.historique || []), { quand: new Date().toISOString(), qui: Router.userProfile.prenom || '', quoi }];
    try {
      const maj = await db.majLead(id, patch);
      Object.assign(l, maj);
      this._render();
      return maj;
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
      return null;
    }
  },

  async attribuer(id, gerantId) {
    const qui = gerantId ? this._gerant(gerantId) : '';
    await this._maj(id, { responsable_id: gerantId || null }, gerantId ? `Pris par ${qui}` : 'Remis dans les nouveaux');
    if (gerantId === Router.userProfile.id && this.vue === 'nouveaux') { this.vue = 'mes'; this._render(); }
  },

  chaleur(id, n) {
    const l = this.leads.find(x => x.id === id);
    this._maj(id, { chaleur: l?.chaleur === n ? null : n }, null);
  },

  notes(id, texte) {
    const l = this.leads.find(x => x.id === id);
    if (!l || (l.notes || '') === texte.trim()) return;
    this._maj(id, { notes: texte.trim() || null }, null);
  },

  motif(id, texte) {
    const l = this.leads.find(x => x.id === id);
    if (!l || (l.motif_perdu || '') === texte.trim()) return;
    this._maj(id, { motif_perdu: texte.trim() || null }, null);
  },

  // Appel sans réponse : appel 2 + SMS plus tard le même jour, appel 3 le
  // lendemain, puis « pas de réponse »
  pasDeReponse(id) {
    const l = this.leads.find(x => x.id === id);
    if (!l) return;
    const n = l.relances + 1;
    const fait = CRM.RELANCES[l.relances];
    if (n >= 3) {
      this._maj(id, { relances: 3, etape: 'sans_reponse', prochaine_le: null, rappel_le: null, clos_le: new Date().toISOString() },
        `${fait} : pas de réponse → Pas de réponse`);
      return;
    }
    let prochaine;
    if (n === 1) prochaine = new Date(Date.now() + 2 * 3600e3);
    else { prochaine = new Date(); prochaine.setDate(prochaine.getDate() + 1); prochaine.setHours(10, 0, 0, 0); }
    this._maj(id, { relances: n, prochaine_le: prochaine.toISOString(), responsable_id: l.responsable_id || Router.userProfile.id },
      `${fait} : pas de réponse`);
  },

  aRepondu(id) {
    const l = this.leads.find(x => x.id === id);
    this._maj(id, { etape: 'setting', setting_le: new Date().toISOString(), rappel_le: null,
      responsable_id: l?.responsable_id || Router.userProfile.id }, 'A répondu → Setting');
  },

  venu(id) {
    this._maj(id, { etape: 'venu', venu_le: new Date().toISOString(), rappel_le: null }, 'Venu au studio');
  },

  pasVenu(id) {
    this._maj(id, { etape: 'setting' }, 'Pas venu au RDV');
  },

  reprendre(id) {
    const l = this.leads.find(x => x.id === id);
    if (!l) return;
    const patch = l.etape === 'sans_reponse'
      ? { etape: 'a_contacter', relances: 0, prochaine_le: new Date().toISOString(), clos_le: null }
      : { etape: l.venu_le ? 'venu' : l.rdv_le ? 'setting' : l.setting_le ? 'setting' : 'a_contacter', clos_le: null,
          prochaine_le: new Date().toISOString() };
    this._maj(id, patch, 'Lead repris');
  },

  finRappel(id) {
    this._maj(id, { rappel_le: null }, null);
  },

  // ── Fenêtres ──────────────────────────────────────────────────────────────
  _modal(titre, corps, bouton, action) {
    this._action = action;
    document.getElementById('coachModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)CoachCrmPage._fermerModal()">
        <div class="modal">
          <div class="modal-title">${titre}<button class="modal-close" onclick="CoachCrmPage._fermerModal()">×</button></div>
          ${corps}
          <div id="crmErreur"></div>
          <button class="btn btn-primary" style="width:100%;margin-top:8px;" id="crmValider" onclick="CoachCrmPage._valider()">${bouton}</button>
        </div>
      </div>`;
  },

  _fermerModal() { document.getElementById('coachModal').innerHTML = ''; },

  async _valider() {
    const btn = document.getElementById('crmValider');
    btn.disabled = true;
    try {
      const ok = await this._action();
      if (ok !== false) this._fermerModal();
      else btn.disabled = false;
    } catch (e) {
      document.getElementById('crmErreur').innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
      btn.disabled = false;
    }
  },

  _erreur(msg) {
    document.getElementById('crmErreur').innerHTML = `<div class="alert alert-error">${escHtml(msg)}</div>`;
    return false;
  },

  nouveau() {
    this._modal('Nouveau lead', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label class="field-label">Prénom</label><input class="input" id="crmPrenom"></div>
        <div class="field"><label class="field-label">Nom</label><input class="input" id="crmNom"></div>
      </div>
      <div class="field"><label class="field-label">Téléphone</label><input class="input" id="crmTel" type="tel" placeholder="06 12 34 56 78"></div>
      <div class="field"><label class="field-label">Email (facultatif)</label><input class="input" id="crmEmail" type="email"></div>
      <div class="field"><label class="field-label">Source</label>
        <select class="input" id="crmSource"><option value="instagram">Instagram</option><option value="autre">Autre (bouche-à-oreille, passage…)</option><option value="meta">Pub Meta</option></select></div>
      <div class="field"><label class="field-label">Notes (facultatif)</label><textarea class="input" id="crmNoteNv" rows="2"></textarea></div>`,
    'Ajouter le lead', async () => {
      const v = i => document.getElementById(i).value.trim();
      if (!v('crmPrenom') && !v('crmNom')) return this._erreur('Indique au moins le prénom.');
      if (!v('crmTel') && !v('crmEmail')) return this._erreur('Indique le téléphone ou l\'email.');
      const lead = await db.creerLead({
        prenom: v('crmPrenom') || null, nom: v('crmNom') || null, telephone: v('crmTel') || null,
        email: v('crmEmail').toLowerCase() || null, source: v('crmSource'), notes: v('crmNoteNv') || null,
        responsable_id: Router.userProfile.id,
        historique: [{ quand: new Date().toISOString(), qui: Router.userProfile.prenom || '', quoi: 'Ajouté à la main' }],
      });
      this.leads.unshift(lead);
      this.vue = 'mes';
      this.choisi = lead.id;
      this._render();
    });
  },

  rappel(id) {
    const l = this.leads.find(x => x.id === id);
    const dans1h = new Date(Date.now() + 3600e3);
    const soir = new Date(); soir.setHours(20, 0, 0, 0);
    const demain = new Date(); demain.setDate(demain.getDate() + 1); demain.setHours(10, 0, 0, 0);
    const choix = [['Dans 1 h', dans1h], ...(soir > new Date() ? [['Ce soir 20:00', soir]] : []), ['Demain 10:00', demain]];
    this._modal(`Rappeler ${escHtml(CRM.nom(l))}`, `
      <div class="crm-aide">Tu recevras une notification à l'heure du rappel.</div>
      <div class="crm-boutons" style="margin-bottom:12px;">
        ${choix.map(([t, d]) => `<button class="btn btn-secondary btn-small" onclick="crmPoserDateHeure('crmQuand','${d.toISOString()}')">${t}</button>`).join('')}
      </div>
      <div class="field"><label class="field-label">Date et heure</label>
        ${crmChampDateHeure('crmQuand', l.rappel_le ? new Date(l.rappel_le) : dans1h)}</div>`,
    'Programmer le rappel', async () => {
      const d = crmLireDateHeure('crmQuand');
      if (!d) return this._erreur('Choisis la date.');
      const r = await this._maj(id, { rappel_le: d.toISOString(), rappel_envoye_pour: null,
        responsable_id: l.responsable_id || Router.userProfile.id }, `Rappel programmé ${CRM.quand(d.toISOString())}`);
      return r ? true : false;
    });
  },

  perdu(id) {
    const l = this.leads.find(x => x.id === id);
    this._modal(`${escHtml(CRM.nom(l))} : perdu`, `
      <div class="field"><label class="field-label">Pourquoi ? (facultatif)</label>
        <textarea class="input" id="crmMotif" rows="3" placeholder="Trop cher, pas le bon moment, trop loin…">${escHtml(l.motif_perdu || '')}</textarea></div>`,
    'Classer en perdu', async () => {
      const motif = document.getElementById('crmMotif').value.trim();
      const r = await this._maj(id, { etape: 'perdu', motif_perdu: motif || null, rappel_le: null, clos_le: new Date().toISOString() },
        'Perdu' + (motif ? ` : ${motif}` : ''));
      return r ? true : false;
    });
  },

  rdv(id) {
    const l = this.leads.find(x => x.id === id);
    const me = Router.userProfile.id;
    let d = l.rdv_le ? new Date(l.rdv_le) : null;
    if (!d) { d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); }
    this._modal(`RDV studio · ${escHtml(CRM.nom(l))}`, `
      <div class="field"><label class="field-label">Date et heure</label>
        ${crmChampDateHeure('crmRdv', d, 15)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label class="field-label">Durée</label>
          <select class="input" id="crmDuree">${[30, 45, 60, 90].map(m => `<option value="${m}" ${m === 60 ? 'selected' : ''}>${m} min</option>`).join('')}</select></div>
        <div class="field"><label class="field-label">Avec</label>
          <select class="input" id="crmCoach">${this.coachs.map(c => `<option value="${c.id}" ${c.id === (l.responsable_id || me) ? 'selected' : ''}>${escHtml(c.prenom)}</option>`).join('')}</select></div>
      </div>
      <div class="crm-aide">Un rendez-vous prospect (jaune) est ajouté dans l'agenda.</div>`,
    l.rdv_creneau_id ? 'Déplacer le RDV' : 'Prendre le RDV', async () => {
      const debut = crmLireDateHeure('crmRdv');
      if (!debut) return this._erreur('Choisis la date.');
      const fin = new Date(debut.getTime() + Number(document.getElementById('crmDuree').value) * 60000);
      const coach = document.getElementById('crmCoach').value;
      let creneauId = l.rdv_creneau_id;
      let deplace = false;
      if (creneauId) {
        try { await db.updateCreneau(creneauId, { debut: debut.toISOString(), fin: fin.toISOString(), coach_id: coach }); deplace = true; }
        catch (_) { creneauId = null; }   // créneau supprimé de l'agenda entre-temps : en créer un autre
      }
      if (!deplace) {
        const [c] = await db.insertCreneaux([{
          type: 'prospect', coach_id: coach, client_id: null,
          prospect_nom: CRM.nom(l), prospect_tel: l.telephone || null,
          debut: debut.toISOString(), fin: fin.toISOString(), journee_entiere: false, en_plus: false,
          notes: 'RDV pris depuis les leads', serie_id: null,
        }]);
        creneauId = c?.id || null;
      }
      const r = await this._maj(id, { etape: 'rdv', rdv_le: debut.toISOString(), rdv_creneau_id: creneauId, rappel_le: null,
        responsable_id: l.responsable_id || me }, `RDV studio ${CRM.quand(debut.toISOString())} avec ${this._gerant(coach)}`);
      return r ? true : false;
    });
  },

  vente(id) {
    const l = this.leads.find(x => x.id === id);
    const formules = this.formules.filter(f => f.actif || f.id === l.formule_id);
    const autre = !l.formule_id && (l.vente_libelle || l.vente_montant != null);
    this._modal(`Vente · ${escHtml(CRM.nom(l))}`, `
      <div class="field"><label class="field-label">Formule vendue</label>
        <select class="input" id="crmFormule" onchange="document.getElementById('crmAutre').style.display=this.value==='autre'?'':'none'">
          <option value="">— Choisir —</option>
          ${formules.map(f => `<option value="${f.id}" ${f.id === l.formule_id ? 'selected' : ''}>${escHtml(f.nom)} · ${escHtml(euros(f.prix_mensuel))}${f.duree_mois ? ` · ${f.duree_mois} mois` : ''}</option>`).join('')}
          <option value="autre" ${autre ? 'selected' : ''}>Autre (formule ou tarif personnalisé)</option>
        </select></div>
      <div id="crmAutre" style="${autre ? '' : 'display:none'}">
        <div class="field"><label class="field-label">Nom</label>
          <input class="input" id="crmAutreNom" value="${escHtml(l.vente_libelle || '')}" placeholder="Coaching duo, 10 séances…"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Montant (€)</label>
            <input class="input" id="crmAutreMontant" type="text" inputmode="decimal" placeholder="45" value="${l.vente_montant ?? ''}"></div>
          <div class="field"><label class="field-label">Par</label>
            <select class="input" id="crmAutreUnite">
              <option value="mois" ${l.vente_unite !== 'seance' ? 'selected' : ''}>mois (abonnement)</option>
              <option value="seance" ${l.vente_unite === 'seance' ? 'selected' : ''}>séance (à la consommation)</option>
            </select></div>
        </div>
      </div>
      ${formules.length ? '' : '<div class="crm-aide">Aucune formule : crée-les dans Gérants › Formules.</div>'}`,
    'Enregistrer la vente', async () => {
      const choix = document.getElementById('crmFormule').value;
      let patch, quoi;
      if (choix === 'autre') {
        const nom = document.getElementById('crmAutreNom').value.trim();
        const brut = document.getElementById('crmAutreMontant').value.replace(',', '.');
        const montant = brut === '' ? null : Number(brut);
        if (!nom && montant == null) return this._erreur('Indique au moins le nom ou le montant.');
        if (montant != null && (!isFinite(montant) || montant < 0)) return this._erreur('Montant invalide.');
        const unite = document.getElementById('crmAutreUnite').value;
        patch = { formule_id: null, vente_libelle: nom || null, vente_montant: montant, vente_unite: unite };
        quoi = `Vente : ${nom || 'formule personnalisée'}${montant != null ? ` (${euros(montant)} / ${unite === 'seance' ? 'séance' : 'mois'})` : ''}`;
      } else {
        const f = this.formules.find(x => x.id === choix);
        patch = { formule_id: choix || null, vente_libelle: null, vente_montant: null, vente_unite: null };
        quoi = `Vente${f ? ' : ' + f.nom : ''}`;
      }
      const r = await this._maj(id, { ...patch, etape: 'vente', vente_le: l.vente_le || new Date().toISOString(), rappel_le: null, clos_le: null }, quoi);
      return r ? true : false;
    });
  },

  // Création du client depuis la vente : fenêtre « Nouveau client » de la page
  // Clients, déjà remplie ; ensuite le lead est relié au client et la formule
  // vendue est posée dans sa facturation (montant mensuel, début aujourd'hui ;
  // « Autre » : montant mensuel ou prix de la séance, nom dans la note).
  creerClient(id) {
    const l = this.leads.find(x => x.id === id);
    CoachClientsPage.showCreateModal();
    const set = (i, v) => { const el = document.getElementById(i); if (el && v) el.value = v; };
    set('newPrenom', l.prenom); set('newNom', l.nom); set('newEmail', l.email); set('newTel', l.telephone);
    CoachClientsPage._apresCreation = async profileId => {
      await this._maj(id, { client_id: profileId }, 'Client créé');
      const f = this.formules.find(x => x.id === l.formule_id);
      let factu = null;
      if (f) factu = { formule_id: f.id, montant_abonnement: f.prix_mensuel, debut_abonnement: formatDate(new Date()) };
      else if (l.vente_montant != null) factu = l.vente_unite === 'seance'
        ? { prix_seance: l.vente_montant, note: l.vente_libelle || null }
        : { montant_abonnement: l.vente_montant, debut_abonnement: formatDate(new Date()), note: l.vente_libelle || null };
      if (factu) await db.saveFacturationClient(profileId, factu)
        .catch(e => toast('Facturation à remplir à la main : ' + e.message, 'error'));
    };
  },

  // ── Chiffres ──────────────────────────────────────────────────────────────
  // Leads arrivés pendant la période, et jusqu'où ils sont allés
  _chiffres() {
    const auj = new Date();
    const periodes = {
      mois: ['Ce mois-ci', new Date(auj.getFullYear(), auj.getMonth(), 1), null],
      dernier: ['Le mois dernier', new Date(auj.getFullYear(), auj.getMonth() - 1, 1), new Date(auj.getFullYear(), auj.getMonth(), 1)],
      trois: ['3 derniers mois', new Date(auj.getFullYear(), auj.getMonth() - 2, 1), null],
      annee: ['Cette année', new Date(auj.getFullYear(), 0, 1), null],
      tout: ['Depuis le début', new Date(2000, 0, 1), null],
    };
    const [, debut, fin] = periodes[this.periode];
    const leads = this.leads.filter(l => new Date(l.cree_le) >= debut && (!fin || new Date(l.cree_le) < fin));
    const compter = liste => ({
      leads: liste.length,
      setting: liste.filter(l => l.setting_le || ['setting', 'rdv', 'venu', 'vente'].includes(l.etape)).length,
      rdv: liste.filter(l => l.rdv_le || ['rdv', 'venu', 'vente'].includes(l.etape)).length,
      venu: liste.filter(l => l.venu_le || ['venu', 'vente'].includes(l.etape)).length,
      vente: liste.filter(l => l.etape === 'vente').length,
      perdu: liste.filter(l => l.etape === 'perdu').length,
      sans: liste.filter(l => l.etape === 'sans_reponse').length,
    });
    const pct = (a, b) => b ? Math.round(a / b * 100) + ' %' : '—';
    const total = compter(leads);
    const parPub = new Map();
    for (const l of leads) {
      const cle = l.source === 'meta' ? (l.publicite || 'Pub Meta (sans nom)') : l.source === 'instagram' ? 'Instagram' : 'Autre';
      parPub.set(cle, [...(parPub.get(cle) || []), l]);
    }
    const lignes = [...parPub.entries()].map(([pub, liste]) => [pub, compter(liste)]).sort((a, b) => b[1].leads - a[1].leads);
    const ligne = (nom, c, gras) => `<tr class="${gras ? 'total' : ''}"><td>${escHtml(nom)}</td><td>${c.leads}</td>
      <td>${c.setting}<small>${pct(c.setting, c.leads)}</small></td><td>${c.rdv}<small>${pct(c.rdv, c.leads)}</small></td>
      <td>${c.venu}<small>${pct(c.venu, c.rdv)}</small></td><td>${c.vente}<small>${pct(c.vente, c.leads)}</small></td>
      <td>${c.perdu}</td><td>${c.sans}</td></tr>`;
    const tuile = (t, v, s) => `<div class="crm-tuile"><div class="crm-tuile-t">${t}</div><div class="crm-tuile-v">${v}</div>${s ? `<div class="crm-tuile-s">${s}</div>` : ''}</div>`;

    return `
      <div class="crm-periodes">${Object.entries(periodes).map(([k, [t]]) =>
        `<button class="crm-vue ${this.periode === k ? 'on' : ''}" onclick="CoachCrmPage.periode='${k}';CoachCrmPage._render()">${t}</button>`).join('')}</div>
      <div class="crm-tuiles">
        ${tuile('Leads', total.leads)}
        ${tuile('Ont répondu', total.setting, pct(total.setting, total.leads) + ' des leads')}
        ${tuile('RDV studio', total.rdv, pct(total.rdv, total.leads) + ' des leads')}
        ${tuile('Venus', total.venu, pct(total.venu, total.rdv) + ' des RDV')}
        ${tuile('Ventes', total.vente, pct(total.vente, total.leads) + ' des leads')}
      </div>
      <div class="crm-table-zone"><table class="crm-table">
        <thead><tr><th>Publicité / source</th><th>Leads</th><th>Setting</th><th>RDV</th><th>Venus <small>/ RDV</small></th><th>Ventes</th><th>Perdus</th><th>Pas de rép.</th></tr></thead>
        <tbody>${lignes.map(([p, c]) => ligne(p, c)).join('')}${lignes.length > 1 ? ligne('Total', total, true) : ''}</tbody>
      </table>${leads.length ? '' : '<div class="crm-vide">Aucun lead sur cette période.</div>'}</div>
      <div class="crm-aide" style="margin-top:8px;">Les leads arrivés pendant la période, et jusqu'où ils sont allés (même si l'étape a eu lieu après).</div>`;
  },
};
