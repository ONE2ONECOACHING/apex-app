// APEX APP — Choix d'emojis (comme WhatsApp) : recherche en français, onglets,
// « Récents » mémorisés sur l'appareil. Utilisé par les plans cardio.
//   EmojiPicker.ouvrir(bouton, emoji => …)

const EmojiPicker = {
  // Une ligne par emoji : l'emoji puis ses mots-clés de recherche
  CATEGORIES: [
    { nom: 'Sport', icone: '🏃', liste: `
      🏃 course courir run running footing jogging
      🏃‍♀️ course courir run running femme
      🚶 marche marcher walk
      🚴 vélo velo bike cycling bikeerg
      🚵 vtt vélo velo bike
      🚣 rameur rame row rowing aviron
      ⛷️ ski skierg
      🏂 snowboard glisse
      🏊 natation nager piscine swim
      🏋️ muscu musculation poids haltère halterophilie force
      🏋️‍♀️ muscu musculation poids femme force
      🤸 gym gainage souplesse burpee
      🤾 lancer wall ball ballon
      🧗 grimper escalade corde
      🤼 lutte combat partenaire team
      🥊 boxe boxing gants
      🧘 yoga étirement etirement mobilite mobilité respiration calme
      🤽 water polo
      ⚽ foot football ballon
      🏀 basket ballon
      🎾 tennis padel
      🏐 volley ballon
      🏈 rugby ballon
      🛶 kayak pagaie
      🏌️ golf
      🏇 cheval
      🤺 escrime
      🥅 but
      🏓 ping pong
      ⛸️ patin
      🛹 skate
      🥏 frisbee
      🎽 maillot dossard course
      👟 basket chaussure running
      🏁 arrivée arrivee finish fin drapeau
      🥇 médaille medaille or premier gagnant
      🥈 médaille medaille argent deuxième
      🥉 médaille medaille bronze troisième
      🏆 coupe trophée trophee victoire gagner
      🏅 médaille medaille sport
      ⏱️ chrono chronomètre temps timer for time
      ⏲️ minuteur timer emom
      ⌛ sablier temps
      ⏰ réveil reveil heure
      🔔 cloche signal` },
    { nom: 'Corps', icone: '💪', liste: `
      💪 bras biceps force muscle fort
      🦵 jambe jambes squat fentes
      🦶 pied pieds
      🫀 cœur coeur cardio fréquence frequence
      ❤️ cœur coeur cardio amour
      💓 cœur coeur battement cardio fc
      💗 cœur coeur
      🫁 poumons respiration souffle
      🧠 cerveau mental tête tete
      🦴 os articulation
      🩸 sang
      🩹 pansement blessure
      🤕 blessé blesse blessure douleur
      🤒 malade fièvre fievre
      🤢 nausée nausee malade
      🥵 chaud chaleur dur intense
      🥶 froid
      💦 sueur transpiration effort
      💧 eau goutte hydratation boire
      😮‍💨 souffle essoufflé essouffle fatigue
      😴 dormir sommeil fatigue repos
      💤 sommeil dodo repos
      🩺 médecin medecin santé sante
      💊 médicament medicament
      🫶 merci cœur coeur
      👍 ok pouce bien validé valide
      👎 pas bien mauvais
      👏 bravo applaudir félicitations felicitations
      🙌 bravo yes
      🤝 accord équipe equipe partenaire binome
      ✌️ paix deux
      🤞 chance
      👊 check poing
      ✊ poing force
      👋 coucou salut bonjour
      🙏 merci svp
      👀 regarder attention
      ☝️ un attention` },
    { nom: 'Visages', icone: '😀', liste: `
      😀 content sourire heureux
      😃 content sourire
      😄 rire content
      😁 sourire dents
      😅 ouf sueur rire
      😂 rire mdr
      🤣 rire mdr
      🙂 sourire ok
      😉 clin d'œil oeil
      😊 content gentil
      😍 adore amour
      🥰 amour cœurs coeurs
      😎 cool lunettes
      🤩 waouh étoiles etoiles
      🥳 fête fete bravo
      😏 malin
      🤔 réfléchir reflechir hmm
      🤨 doute
      😐 neutre bof
      😑 bof
      🙄 pff
      😬 oups gêne gene
      😮 surpris
      😯 surpris
      😲 choc surpris
      😳 gêné gene
      🥺 svp
      😢 triste pleurer
      😭 pleurer triste
      😤 rage déterminé determine motivé motive
      😡 colère colere énervé enerve
      🤬 colère colere
      🤯 explosé explose dingue
      😱 peur
      😰 stress
      😓 sueur dur
      😩 épuisé epuise fatigué fatigue
      😫 épuisé epuise
      🥱 bâiller bailler fatigue
      😵 ko épuisé epuise
      😵‍💫 vertige tête tete
      🤪 fou
      😜 blague
      🤗 câlin calin
      🤫 chut secret
      🫡 salut chef
      😇 ange sage
      🤡 clown
      💀 mort ko
      👻 fantôme fantome` },
    { nom: 'Symboles', icone: '✅', liste: `
      ✅ fait validé valide ok coche
      ☑️ coche fait
      ✔️ coche ok
      ❌ non pas fait annulé annule croix
      ⛔ interdit stop
      🚫 interdit non
      ⚠️ attention prudence alerte
      ❗ important attention
      ❓ question
      ‼️ très important
      📌 épingle epingle important note
      📍 lieu point
      🎯 objectif cible but
      🔥 feu intense chaud motivation
      ⚡ éclair eclair rapide énergie energie vitesse
      💥 explosion puissance
      ✨ étoiles etoiles bravo
      ⭐ étoile etoile
      🌟 étoile etoile top
      💯 cent parfait top
      🔁 répéter repeter rounds tours boucle
      🔄 répéter repeter recommencer
      ⏸️ pause repos récup recup
      ▶️ go départ depart
      ⏩ rapide accélérer accelerer
      ⬆️ haut monter augmenter plus
      ⬇️ bas baisser diminuer moins
      ➡️ droite suite ensuite
      ⬅️ gauche retour
      ↗️ hausse progression
      ↘️ baisse
      📈 progression hausse amélioration amelioration
      📉 baisse
      📊 stats statistiques
      📝 note écrire ecrire
      📋 liste programme
      📅 calendrier date
      🗓️ calendrier planning
      🆕 nouveau
      🆗 ok
      🔝 top
      🔴 rouge zone
      🟠 orange zone
      🟡 jaune zone
      🟢 vert zone
      🔵 bleu zone
      🟣 violet zone
      ⚪ blanc
      ⚫ noir
      0️⃣ zéro zero
      1️⃣ un 1
      2️⃣ deux 2
      3️⃣ trois 3
      4️⃣ quatre 4
      5️⃣ cinq 5
      6️⃣ six 6
      7️⃣ sept 7
      8️⃣ huit 8
      9️⃣ neuf 9
      🔟 dix 10
      ➕ plus ajouter
      ➖ moins
      ✖️ fois multiplier
      🟰 égal egal` },
    { nom: 'Nourriture', icone: '🍌', liste: `
      🍌 banane fruit
      🍎 pomme fruit
      🍊 orange fruit
      🍓 fraise fruit
      🍇 raisin fruit
      🥝 kiwi fruit
      🍍 ananas fruit
      🥑 avocat
      🥦 brocoli légume legume
      🥕 carotte légume legume
      🥗 salade
      🍚 riz
      🍝 pâtes pates
      🍞 pain
      🥐 croissant
      🥣 bol céréales cereales flocons avoine
      🥚 œuf oeuf
      🍗 poulet viande
      🥩 viande steak
      🐟 poisson
      🥜 cacahuète cacahuete noix
      🧀 fromage
      🥛 lait
      🍫 chocolat
      🍯 miel
      🥤 boisson shaker
      ☕ café cafe
      🍵 thé the
      🍷 vin alcool
      🍺 bière biere alcool
      🍽️ repas
      🍴 manger repas` },
  ],

  _cleRecents: 'emojisRecents',
  _boite: null,
  _onglet: 'Récents',

  _donnees() {
    if (!this._toutes) this._toutes = this.CATEGORIES.map(c => ({
      ...c,
      emojis: c.liste.trim().split('\n').map(l => {
        const [e, ...mots] = l.trim().split(/\s+/);
        return { e, mots: (c.nom + ' ' + mots.join(' ')).toLowerCase() };
      }),
    }));
    return this._toutes;
  },

  _recents() {
    try { return JSON.parse(localStorage.getItem(this._cleRecents) || '[]'); } catch (_) { return []; }
  },

  _noterRecent(e) {
    const liste = [e, ...this._recents().filter(x => x !== e)].slice(0, 24);
    try { localStorage.setItem(this._cleRecents, JSON.stringify(liste)); } catch (_) {}
  },

  _sansAccent(t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); },

  fermer() {
    if (this._boite) { this._boite.remove(); this._boite = null; }
    document.removeEventListener('mousedown', this._fermerDehors, true);
  },

  // Ouvre la grille sous le bouton ; un clic sur un emoji appelle choisir(emoji)
  ouvrir(btn, choisir) {
    const memeBouton = this._boite && this._bouton === btn;
    this.fermer();
    if (memeBouton) return;
    this._bouton = btn;
    this._choisir = choisir;
    if (!this._recents().length && this._onglet === 'Récents') this._onglet = 'Sport';

    const boite = document.createElement('div');
    boite.className = 'emoji-picker';
    boite.innerHTML = `
      <input class="emoji-recherche" type="search" placeholder="Rechercher (course, cœur, chrono…)">
      <div class="emoji-onglets"></div>
      <div class="emoji-titre"></div>
      <div class="emoji-grille"></div>`;
    document.body.appendChild(boite);
    this._boite = boite;
    this._placer();

    const recherche = boite.querySelector('.emoji-recherche');
    recherche.oninput = () => this._afficher();
    // mousedown : le champ en cours de saisie garde la position du curseur (sauf la recherche)
    boite.onmousedown = ev => { if (ev.target !== recherche) ev.preventDefault(); };
    boite.onclick = ev => {
      const o = ev.target.closest('[data-onglet]');
      if (o) { this._onglet = o.dataset.onglet; recherche.value = ''; this._afficher(); return; }
      const b = ev.target.closest('[data-emoji]');
      if (b) { this._noterRecent(b.dataset.emoji); this._choisir(b.dataset.emoji); if (this._onglet !== 'Récents') this._afficherOnglets(); }
    };
    this._fermerDehors = ev => { if (!boite.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) this.fermer(); };
    document.addEventListener('mousedown', this._fermerDehors, true);
    this._afficher();
  },

  _placer() {
    const r = this._bouton.getBoundingClientRect(), l = 300, h = 340;
    const s = this._boite.style;
    s.left = Math.max(8, Math.min(r.right - l, window.innerWidth - l - 8)) + 'px';
    s.top = (r.bottom + 4 + h > window.innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
  },

  _afficherOnglets() {
    const onglets = [{ nom: 'Récents', icone: '🕘' }, ...this.CATEGORIES];
    this._boite.querySelector('.emoji-onglets').innerHTML = onglets.map(o =>
      `<button type="button" data-onglet="${o.nom}" title="${o.nom}" class="${o.nom === this._onglet ? 'on' : ''}">${o.icone}</button>`).join('');
  },

  _afficher() {
    const q = this._sansAccent(this._boite.querySelector('.emoji-recherche').value.trim());
    let titre, emojis;
    if (q) {
      const mots = q.split(/\s+/);
      const vus = new Set();
      emojis = this._donnees().flatMap(c => c.emojis)
        .filter(x => mots.every(m => this._sansAccent(x.mots).split(/\s+/).some(w => w.startsWith(m))))
        .map(x => x.e).filter(e => !vus.has(e) && vus.add(e));
      titre = emojis.length ? 'Résultats' : 'Aucun emoji trouvé';
    } else if (this._onglet === 'Récents') {
      emojis = this._recents();
      titre = emojis.length ? 'Récents' : 'Aucun emoji utilisé pour l\'instant';
    } else {
      const c = this._donnees().find(x => x.nom === this._onglet) || this._donnees()[0];
      titre = c.nom;
      emojis = c.emojis.map(x => x.e);
    }
    this._afficherOnglets();
    this._boite.querySelector('.emoji-onglets').classList.toggle('grise', !!q);
    this._boite.querySelector('.emoji-titre').textContent = titre;
    this._boite.querySelector('.emoji-grille').innerHTML =
      emojis.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('');
  },
};
