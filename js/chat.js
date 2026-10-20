// APEX APP — Conversation (messagerie), partagée par l'espace coach et l'app client
// Chat.ouvrir(conteneur, { clientId, canal, peutEcrire }) ; Chat.fermer()
// Bulles, photos, vocaux, « Vu », suppression de ses messages, messages en direct.

const Chat = {
  opts: null,
  el: null,
  messages: [],
  lectures: [],
  noms: {},            // id → prénom (auteurs)
  _urls: {},           // chemin d'une pièce → adresse signée
  _canal: null,        // abonnement en direct
  _minuteur: null,     // rafraîchissement des « Vu »
  _enreg: null,        // enregistrement vocal en cours
  _selection: null,    // message (à moi) dont on affiche « Supprimer »

  async ouvrir(conteneur, opts) {
    this.fermer();
    // Numéro de cette ouverture : si une autre conversation est ouverte pendant le
    // chargement (clic rapide), le résultat de celle-ci est ignoré
    const gen = this._gen;
    this.opts = opts;
    this.el = conteneur;
    this.messages = [];
    this.lectures = [];
    this._selection = null;
    conteneur.innerHTML = `
      <div class="chat">
        <div class="chat-fil" id="chatFil"><div class="spinner" style="margin:2rem auto;"></div></div>
        ${opts.peutEcrire ? `
        <div class="chat-saisie" id="chatSaisie">
          <button class="chat-btn" aria-label="Envoyer une photo" onclick="document.getElementById('chatPhoto').click()">📷</button>
          <input type="file" id="chatPhoto" accept="image/*" hidden onchange="Chat.envoyerPhoto(this)">
          <textarea id="chatTexte" rows="1" placeholder="Message" oninput="Chat._ajuster(this)"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey&&!('ontouchstart' in window)){event.preventDefault();Chat.envoyerTexte();}"></textarea>
          <button class="chat-btn chat-envoyer" id="chatBtnEnvoyer" aria-label="Envoyer" onclick="Chat._boutonPrincipal()">🎤</button>
        </div>` : `<div class="chat-lecture">Lecture seule</div>`}
      </div>`;

    try {
      const [messages, lectures, coachs, client] = await Promise.all([
        db.getMessages(opts.clientId, opts.canal),
        db.getLecturesConversation(opts.clientId, opts.canal).catch(() => []),
        db.getPrenomsCoachs().catch(() => []),
        opts.clientNom ? Promise.resolve(null) : db.getProfile(opts.clientId).catch(() => null),
      ]);
      if (gen !== this._gen || !this.opts) return;
      this.messages = messages;
      this.lectures = lectures;
      for (const c of coachs) this.noms[c.id] = c.prenom || 'Coach';
      this.noms[opts.clientId] = opts.clientNom || client?.prenom || 'Client';
      this._render(true);
      this._marquerLu();
      this._ecouter();
      this._minuteur = setInterval(() => this._rafraichirLectures(), 20000);
    } catch (e) {
      if (gen !== this._gen) return;
      const fil = document.getElementById('chatFil');
      if (fil) fil.innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
    }
  },

  fermer() {
    this._gen = (this._gen || 0) + 1;
    if (this._canal) { try { getSupabase().removeChannel(this._canal); } catch (_) {} }
    this._canal = null;
    clearInterval(this._minuteur);
    this._minuteur = null;
    this._arreterEnregistrement(true);
    this.opts = null;
    this.el = null;
  },

  _moi() { return Router.userProfile?.id; },

  // ── Direct et lectures ─────────────────────────────────────────────────────

  _ecouter() {
    const { clientId, canal } = this.opts;
    this._canal = getSupabase()
      .channel(`messages-${clientId}-${canal}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` }, p => {
        const m = p.new;
        if (!m || m.canal !== canal || !this.opts) return;
        const i = this.messages.findIndex(x => x.id === m.id);
        if (i >= 0) this.messages[i] = m; else this.messages.push(m);
        this._render(true);
        if (this.opts.surMessage) this.opts.surMessage(m);
        if (m.auteur_id !== this._moi()) this._marquerLu();
      })
      // « Vu » en direct : l'autre vient d'ouvrir la conversation
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages_lectures', filter: `client_id=eq.${clientId}` }, p => {
        const l = p.new;
        if (!l || l.canal !== canal || !this.opts) return;
        this.lectures = this.lectures.filter(x => x.lecteur_id !== l.lecteur_id).concat(l);
        this._majVu();
      })
      .subscribe();
  },

  async _marquerLu() {
    // En lecture seule (gérant qui consulte), on ne marque rien : sinon le client
    // verrait « Vu » alors que son coach n'a pas lu
    if (!this.opts || document.hidden || !this.opts.peutEcrire) return;
    try { await db.marquerConversationLue(this.opts.clientId, this.opts.canal); } catch (_) {}
    if (typeof rafraichirCompteurMessages === 'function') rafraichirCompteurMessages();
  },

  async _rafraichirLectures() {
    if (!this.opts) return;
    try {
      this.lectures = await db.getLecturesConversation(this.opts.clientId, this.opts.canal);
      this._majVu();
    } catch (_) {}
  },

  // ── Affichage ──────────────────────────────────────────────────────────────

  _jour(d) {
    const auj = new Date(); auj.setHours(0, 0, 0, 0);
    const j = new Date(d); j.setHours(0, 0, 0, 0);
    const diff = Math.round((auj - j) / 864e5);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    return j.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  },

  _render(enBas) {
    const fil = document.getElementById('chatFil');
    if (!fil || !this.opts) return;
    const moi = this._moi();
    const basAvant = fil.scrollHeight - fil.scrollTop - fil.clientHeight < 80;

    const { dernierAMoi, vu } = this._etatVu();

    let html = '';
    let jourPrec = null, auteurPrec = null;
    if (!this.messages.length) {
      html = `<div class="chat-vide">Aucun message pour l'instant.${this.opts.peutEcrire ? ' Écris le premier !' : ''}</div>`;
    }
    for (const m of this.messages) {
      const jour = this._jour(m.cree_le);
      if (jour !== jourPrec) { html += `<div class="chat-jour">${jour}</div>`; jourPrec = jour; auteurPrec = null; }
      const aMoi = m.auteur_id === moi;
      const heure = new Date(m.cree_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const nom = !aMoi && m.auteur_id !== auteurPrec
        ? `<div class="chat-auteur">${escHtml(this.noms[m.auteur_id] || (m.auteur_id === this.opts.clientId ? 'Client' : 'Coach'))}</div>` : '';
      let contenu;
      if (m.supprime) contenu = '<span class="chat-supprime">Message supprimé</span>';
      else if (m.piece_type === 'photo') contenu = `<img class="chat-photo" data-path="${escHtml(m.piece_path)}" alt="Photo" onclick="Chat._voirPhoto(this)">`;
      else if (m.piece_type === 'vocal') contenu = `<audio class="chat-vocal" controls preload="none" data-path="${escHtml(m.piece_path)}"></audio>`;
      else contenu = escHtml(m.texte || '').replace(/\n/g, '<br>');
      const peutSupprimer = aMoi && !m.supprime && this.opts.peutEcrire;
      html += `
        <div class="chat-ligne ${aMoi ? 'moi' : ''}" data-msg="${m.id}">
          ${nom}
          <div class="chat-bulle ${m.piece_type ? 'piece' : ''}" ${peutSupprimer ? `onclick="Chat._selectionner('${m.id}')"` : ''}>
            ${contenu}<span class="chat-heure">${heure}</span>
          </div>
          ${this._selection === m.id ? `<button class="chat-suppr" onclick="Chat.supprimer('${m.id}')">🗑 Supprimer</button>` : ''}
          ${m === dernierAMoi && vu ? '<div class="chat-vu">Vu</div>' : ''}
        </div>`;
      auteurPrec = m.auteur_id;
    }
    fil.innerHTML = html;
    this._chargerPieces(fil);
    if (enBas || basAvant) fil.scrollTop = fil.scrollHeight;
  },

  // « Vu » : mon dernier message a-t-il été lu par la bonne personne ?
  // Coach : par le client. Client : par un coach (pas par lui-même).
  _etatVu() {
    const moi = this._moi();
    const mesMessages = this.messages.filter(m => m.auteur_id === moi && !m.supprime);
    const dernierAMoi = mesMessages[mesMessages.length - 1];
    const coach = Router.userProfile?.role === 'coach';
    const vu = !!dernierAMoi && this.lectures.some(l =>
      (coach ? l.lecteur_id === this.opts.clientId : l.lecteur_id !== moi)
      && new Date(l.lu_jusqu_a) >= new Date(dernierAMoi.cree_le));
    return { dernierAMoi, vu };
  },

  // Met à jour le seul « Vu » sans redessiner le fil (un vocal en cours continue)
  _majVu() {
    const fil = document.getElementById('chatFil');
    if (!fil || !this.opts) return;
    fil.querySelectorAll('.chat-vu').forEach(el => el.remove());
    const { dernierAMoi, vu } = this._etatVu();
    if (!vu) return;
    const ligne = fil.querySelector(`[data-msg="${dernierAMoi.id}"]`);
    if (ligne) ligne.insertAdjacentHTML('beforeend', '<div class="chat-vu">Vu</div>');
  },

  async _chargerPieces(fil) {
    for (const el of fil.querySelectorAll('[data-path]')) {
      const path = el.dataset.path;
      try {
        const c = this._urls[path];
        if (!c || Date.now() - c.le > 50 * 60000) this._urls[path] = { url: await db.urlPieceMessage(path), le: Date.now() };
        el.src = this._urls[path].url;
        if (el.tagName === 'IMG') el.onload = () => { if (fil.scrollHeight - fil.scrollTop - fil.clientHeight < 400) fil.scrollTop = fil.scrollHeight; };
      } catch (_) {}
    }
  },

  _voirPhoto(img) { if (img.src) window.open(img.src, '_blank'); },

  _selectionner(id) { this._selection = this._selection === id ? null : id; this._render(false); },

  async supprimer(id) {
    if (!confirm('Supprimer ce message ? Il sera remplacé par « Message supprimé ».')) return;
    try {
      await db.supprimerMessage(id);
      const m = this.messages.find(x => x.id === id);
      if (m) Object.assign(m, { supprime: true, texte: null, piece_type: null, piece_path: null });
      this._selection = null;
      this._render(false);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  // ── Envoi ──────────────────────────────────────────────────────────────────

  _ajuster(t) {
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 140) + 'px';
    document.getElementById('chatBtnEnvoyer').textContent = t.value.trim() ? '➤' : '🎤';
  },

  _boutonPrincipal() {
    const t = document.getElementById('chatTexte');
    if (t.value.trim()) this.envoyerTexte(); else this.commencerVocal();
  },

  _ajouter(m) {
    if (!this.messages.some(x => x.id === m.id)) this.messages.push(m);
    this._render(true);
    if (this.opts?.surMessage) this.opts.surMessage(m);
  },

  async envoyerTexte() {
    const t = document.getElementById('chatTexte');
    const texte = t.value.trim();
    if (!texte || !this.opts) return;
    t.value = '';
    this._ajuster(t);
    try {
      this._ajouter(await db.envoyerMessage(this.opts.clientId, this.opts.canal, { texte }));
    } catch (e) {
      t.value = texte;
      this._ajuster(t);
      toast('Message non envoyé : ' + e.message, 'error');
    }
  },

  // Photo allégée (1600 px maximum, JPEG) avant l'envoi
  async envoyerPhoto(input) {
    const fichier = input.files?.[0];
    input.value = '';
    if (!fichier || !this.opts) return;
    toast('Envoi de la photo…', 'info');
    try {
      const blob = await this._alleger(fichier);
      const path = await db.envoyerPieceMessage(this.opts.clientId, this.opts.canal, blob, 'jpg');
      this._ajouter(await db.envoyerMessage(this.opts.clientId, this.opts.canal, { piece_type: 'photo', piece_path: path }));
    } catch (e) { toast('Photo non envoyée : ' + e.message, 'error'); }
  },

  _alleger(fichier) {
    return new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => {
        const max = 1600, r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => b ? ok(b) : ko(new Error('Image illisible')), 'image/jpeg', 0.82);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => ko(new Error('Image illisible'));
      img.src = URL.createObjectURL(fichier);
    });
  },

  // Vocal : un appui démarre l'enregistrement, puis « Envoyer » ou « Annuler » (2 min max)
  async commencerVocal() {
    if (this._enreg || !this.opts) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast('Les messages vocaux ne sont pas disponibles sur cet appareil.', 'error'); return;
    }
    let flux;
    try { flux = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (_) { toast('Autorise l\'accès au micro pour envoyer un vocal.', 'error'); return; }
    // Page quittée pendant la demande d'autorisation : couper le micro tout de suite
    if (!this.opts || !document.getElementById('chatSaisie')) { flux.getTracks().forEach(t => t.stop()); return; }
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported?.(t)) || '';
    const rec = new MediaRecorder(flux, type ? { mimeType: type } : undefined);
    const morceaux = [];
    rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
    this._enreg = { rec, flux, morceaux, debut: Date.now(), type: rec.mimeType || type, envoyer: false };
    rec.onstop = () => this._finVocal();
    rec.start();

    const saisie = document.getElementById('chatSaisie');
    this._enreg.saisieHtml = saisie.innerHTML;
    saisie.innerHTML = `
      <button class="chat-btn" aria-label="Annuler" onclick="Chat._arreterEnregistrement(true)">✕</button>
      <div class="chat-enreg"><span class="chat-point"></span> Enregistrement <b id="chatChrono">0:00</b></div>
      <button class="chat-btn chat-envoyer" aria-label="Envoyer le vocal" onclick="Chat._arreterEnregistrement(false)">➤</button>`;
    this._enreg.chrono = setInterval(() => {
      const s = Math.floor((Date.now() - this._enreg.debut) / 1000);
      const el = document.getElementById('chatChrono');
      if (el) el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (s >= 120) this._arreterEnregistrement(false);
    }, 250);
  },

  _arreterEnregistrement(annuler) {
    const e = this._enreg;
    if (!e) return;
    e.envoyer = !annuler;
    clearInterval(e.chrono);
    try { if (e.rec.state !== 'inactive') e.rec.stop(); else this._finVocal(); } catch (_) { this._finVocal(); }
  },

  async _finVocal() {
    const e = this._enreg;
    if (!e) return;
    this._enreg = null;
    e.flux.getTracks().forEach(t => t.stop());
    const saisie = document.getElementById('chatSaisie');
    if (saisie && e.saisieHtml) saisie.innerHTML = e.saisieHtml;
    if (!e.envoyer || !this.opts) return;
    const duree = Math.round((Date.now() - e.debut) / 1000);
    if (duree < 1) return;
    const type = (e.type || 'audio/webm').split(';')[0];
    const blob = new Blob(e.morceaux, { type });
    const ext = type.includes('mp4') ? 'm4a' : 'webm';
    try {
      const path = await db.envoyerPieceMessage(this.opts.clientId, this.opts.canal, blob, ext);
      this._ajouter(await db.envoyerMessage(this.opts.clientId, this.opts.canal, { piece_type: 'vocal', piece_path: path, piece_duree: duree }));
    } catch (err) { toast('Vocal non envoyé : ' + err.message, 'error'); }
  },
};

// ── Compteur de messages non lus (menu coach, accueil client) ───────────────
// Coach : seulement les conversations où il peut répondre (ses clients suivis,
// les clients studio) ; les conversations qu'un gérant ne fait que lire ne comptent pas.
// Même règle que la liste de la messagerie : clients actifs, canal prévu pour leur
// type (studio : equipe ; distance : suivi ; studio + suivi : les deux), suivi
// seulement pour son référent. Liste des clients relue toutes les 5 minutes.
let _clientsMessagerie = null, _clientsMessagerieLe = 0;
async function compterMessagesNonLus() {
  const moi = Router.userProfile;
  if (!moi) return 0;
  const resume = await db.getConversationsResume().catch(() => []);
  if (moi.role !== 'coach') return resume.reduce((t, r) => t + Number(r.non_lus || 0), 0);
  if (!_clientsMessagerie || Date.now() - _clientsMessagerieLe > 300000) {
    const liste = await db.getClientsAgenda().catch(() => null);
    if (liste) { _clientsMessagerie = liste; _clientsMessagerieLe = Date.now(); }
  }
  const parId = new Map((_clientsMessagerie || []).map(c => [c.id, c]));
  return resume.reduce((t, r) => {
    const c = parId.get(r.client_id);
    if (!c) return t;
    const canaux = c.type_client === 'studio' ? ['equipe'] : c.type_client === 'suivi' ? ['suivi', 'equipe'] : ['suivi'];
    const concerne = canaux.includes(r.canal) && (r.canal === 'equipe' || c.coach_referent_id === moi.id);
    return t + (concerne ? Number(r.non_lus || 0) : 0);
  }, 0);
}

async function rafraichirCompteurMessages() {
  const n = await compterMessagesNonLus();
  document.querySelectorAll('[data-compteur-messages]').forEach(el => {
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = !n;
  });
}

// Lecture des messages quand l'app revient au premier plan
document.addEventListener('visibilitychange', () => { if (!document.hidden && Chat.opts) Chat._marquerLu(); });
