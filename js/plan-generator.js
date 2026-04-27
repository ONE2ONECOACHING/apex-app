// APEX APP — Générateur de plan alimentaire
// Génération déterministe basée sur macros cibles

const PlanGenerator = {

  // Macros pour 100g (cuit/prêt à manger) ou par unité
  FOODS: {
    // ── Protéines animales ────────────────────────────────────────────────
    'Poulet blanc cuit':  { cal: 165, p: 31,  g: 0,   l: 4,  f: 0,  mode: 'g' },
    'Saumon':             { cal: 208, p: 20,  g: 0,   l: 14, f: 0,  mode: 'g' },
    'Thon en boite':      { cal: 116, p: 26,  g: 0,   l: 1,  f: 0,  mode: 'g' },
    'Boeuf haché 5%':     { cal: 137, p: 21,  g: 0,   l: 5,  f: 0,  mode: 'g' },
    'Blanc de dinde':     { cal: 135, p: 30,  g: 0,   l: 1,  f: 0,  mode: 'g' },
    'Oeuf entier':        { cal: 78,  p: 6,   g: 0,   l: 5,  f: 0,  mode: 'unit', perG: 60 },
    'Bacon':              { cal: 541, p: 37,  g: 1,   l: 42, f: 0,  mode: 'g' },

    // ── Protéines végétales ───────────────────────────────────────────────
    'Tofu ferme':         { cal: 76,  p: 8,   g: 2,   l: 4,  f: 0,  mode: 'g' },
    'Pois chiches cuits': { cal: 164, p: 9,   g: 27,  l: 3,  f: 8,  mode: 'g' },
    'Lentilles cuites':   { cal: 116, p: 9,   g: 20,  l: 0,  f: 8,  mode: 'g' },

    // ── Féculents ─────────────────────────────────────────────────────────
    'Riz blanc cuit':     { cal: 130, p: 3,   g: 28,  l: 0,  f: 0,  mode: 'g' },
    'Pâtes cuites':       { cal: 131, p: 5,   g: 25,  l: 1,  f: 2,  mode: 'g' },
    'Patate douce cuite': { cal: 86,  p: 2,   g: 20,  l: 0,  f: 3,  mode: 'g' },
    'Quinoa cuit':        { cal: 120, p: 4,   g: 22,  l: 2,  f: 3,  mode: 'g' },
    'Pain complet':       { cal: 247, p: 9,   g: 41,  l: 4,  f: 6,  mode: 'g' },
    "Flocons d'avoine":   { cal: 379, p: 13,  g: 67,  l: 7,  f: 10, mode: 'g' },

    // ── Légumes ───────────────────────────────────────────────────────────
    'Brocoli cuit':       { cal: 35,  p: 3,   g: 4,   l: 0,  f: 3,  mode: 'g' },
    'Haricots verts':     { cal: 31,  p: 2,   g: 5,   l: 0,  f: 3,  mode: 'g' },
    'Courgette cuite':    { cal: 17,  p: 1,   g: 3,   l: 0,  f: 1,  mode: 'g' },
    'Epinards cuits':     { cal: 23,  p: 3,   g: 2,   l: 0,  f: 2,  mode: 'g' },

    // ── Laitiers ──────────────────────────────────────────────────────────
    'Fromage blanc 0%':   { cal: 49,  p: 8,   g: 4,   l: 0,  f: 0,  mode: 'g' },
    'Skyr':               { cal: 63,  p: 11,  g: 4,   l: 0,  f: 0,  mode: 'g' },
    'Yaourt grec 0%':     { cal: 57,  p: 10,  g: 4,   l: 0,  f: 0,  mode: 'g' },

    // ── Suppléments ───────────────────────────────────────────────────────
    'Whey protéine':      { cal: 120, p: 24,  g: 3,   l: 2,  f: 0,  mode: 'g' },

    // ── Fruits ────────────────────────────────────────────────────────────
    'Banane':             { cal: 89,  p: 1,   g: 23,  l: 0,  f: 3,  mode: 'unit', perG: 120 },
    'Pomme':              { cal: 52,  p: 0,   g: 14,  l: 0,  f: 2,  mode: 'unit', perG: 150 },
    'Fraises':            { cal: 32,  p: 1,   g: 8,   l: 0,  f: 2,  mode: 'g' },
    'Myrtilles':          { cal: 57,  p: 1,   g: 14,  l: 0,  f: 2,  mode: 'g' },
    'Orange':             { cal: 47,  p: 1,   g: 12,  l: 0,  f: 2,  mode: 'unit', perG: 180 },

    // ── Extras ────────────────────────────────────────────────────────────
    'Avocat':             { cal: 160, p: 2,   g: 9,   l: 15, f: 7,  mode: 'g' },
    'Confiture':          { cal: 250, p: 0,   g: 65,  l: 0,  f: 1,  mode: 'g' },
    'Miel':               { cal: 304, p: 0,   g: 82,  l: 0,  f: 0,  mode: 'g' },
    'Amandes':            { cal: 579, p: 21,  g: 22,  l: 50, f: 12, mode: 'g' },
    'Chocolat noir 70%':  { cal: 598, p: 8,   g: 46,  l: 43, f: 11, mode: 'g' },
    'Beurre de cacahuète':{ cal: 588, p: 25,  g: 20,  l: 50, f: 6,  mode: 'g' },
  },

  // Calcule les macros d'un item à une quantité donnée
  item(nom, qty, creneau) {
    const f = this.FOODS[nom];
    if (!f || qty <= 0) return null;
    const factor = f.mode === 'unit' ? qty * (f.perG / 100) : qty / 100;
    return {
      creneau,
      aliment_nom: nom,
      quantite:  qty,
      unite:     f.mode === 'unit' ? 'unité' : 'g',
      calories:  Math.round(f.cal * factor * 10) / 10,
      proteines: Math.round(f.p   * factor * 10) / 10,
      glucides:  Math.round(f.g   * factor * 10) / 10,
      lipides:   Math.round(f.l   * factor * 10) / 10,
      fibres:    Math.round((f.f || 0) * factor * 10) / 10,
      _aliment: { ...f, nom, mode: f.mode }
    };
  },

  // Arrondit à un multiple propre
  round(qty, step) { return Math.max(step, Math.round(qty / step) * step); },

  // Génère un repas principal (déjeuner ou dîner) pour atteindre les macros cibles
  mainMeal(targetP, targetG, creneau, opts, isLunch) {
    const items = [];

    // Source de protéine
    const proteinSrc = opts.vegetarien
      ? (isLunch ? 'Tofu ferme' : 'Lentilles cuites')
      : (isLunch ? 'Poulet blanc cuit' : 'Saumon');

    const fp = this.FOODS[proteinSrc];
    const protQty = this.round(targetP * 0.85 / (fp.p / 100), 25);
    items.push(this.item(proteinSrc, protQty, creneau));

    // Féculent
    const starchSrc = isLunch ? 'Riz blanc cuit' : 'Patate douce cuite';
    const fs = this.FOODS[starchSrc];
    const glucFromProt = items.reduce((s, i) => s + i.glucides, 0);
    const starchQty = this.round(Math.max(50, (targetG - glucFromProt) * 0.85 / (fs.g / 100)), 25);
    items.push(this.item(starchSrc, starchQty, creneau));

    // Légume (portion fixe)
    const vegSrc = isLunch ? 'Brocoli cuit' : 'Haricots verts';
    items.push(this.item(vegSrc, 200, creneau));

    return items;
  },

  // Point d'entrée principal
  generate(opts, targets) {
    const { nbRepas, colMatin, colAprem, colSoir, vegetarien, whey } = opts;
    const nbSnacks = (colMatin ? 1 : 0) + (colAprem ? 1 : 0) + (colSoir ? 1 : 0);
    const cal = targets.calories;

    // Distribution calorique
    const hasPdej = nbRepas === 3;
    const pdejPct  = hasPdej ? 0.20 : 0;
    const snackPct = nbSnacks > 0 ? 0.15 : 0;
    const mainPct  = 1 - pdejPct - snackPct;
    const lunchPct = mainPct * 0.55;
    const dinnerPct = mainPct * 0.45;
    const snackEach = nbSnacks > 0 ? (cal * snackPct) / nbSnacks : 0;

    const t = targets;
    const repas = [];
    const add = (items) => items.forEach(i => { if (i) repas.push(i); });

    // ── PETIT DÉJEUNER ────────────────────────────────────────────────────
    if (hasPdej) {
      const pdejKcal = cal * pdejPct;
      const scale    = Math.max(0.5, pdejKcal / 420); // base ≈ 420 kcal

      // Salé
      const nbOeufs  = Math.max(1, Math.round(3 * scale));
      const painQty  = this.round(60 * scale, 10);
      const useAvoc  = !vegetarien || true; // toujours avocat en salé végé
      const avoSrc   = (vegetarien || pdejKcal < 450) ? 'Avocat' : 'Bacon';
      const avoQty   = avoSrc === 'Avocat' ? this.round(80 * scale, 10) : this.round(30 * scale, 5);

      add([
        this.item('Oeuf entier',  nbOeufs,  'petit_dejeuner_sale'),
        this.item('Pain complet', painQty,  'petit_dejeuner_sale'),
        this.item(avoSrc,         avoQty,   'petit_dejeuner_sale'),
        this.item('Banane',       1,        'petit_dejeuner_sale'),
      ]);

      // Sucré
      const fbQty    = this.round(150 * scale, 25);
      const avoineQty = this.round(50 * scale, 10);
      const sucreQty = this.round(15 * scale, 5);
      const sucreSrc = pdejKcal > 450 ? 'Confiture' : 'Miel';

      add([
        this.item('Fromage blanc 0%', fbQty,     'petit_dejeuner_sucre'),
        this.item("Flocons d'avoine", avoineQty,  'petit_dejeuner_sucre'),
        this.item(sucreSrc,           sucreQty,  'petit_dejeuner_sucre'),
        this.item('Pomme',            1,         'petit_dejeuner_sucre'),
      ]);
    }

    // ── COLLATION MATIN ───────────────────────────────────────────────────
    if (colMatin) {
      if (whey) {
        const wheyQty = this.round((t.proteines * (snackPct / nbSnacks) * 0.75) / (this.FOODS['Whey protéine'].p / 100), 5);
        add([
          this.item('Whey protéine', wheyQty, 'collation_matin'),
          this.item('Banane',        1,        'collation_matin'),
          this.item('Amandes',       20,       'collation_matin'),
        ]);
      } else {
        const fbQty = this.round((snackEach * 0.65) / (this.FOODS['Fromage blanc 0%'].cal / 100), 25);
        add([
          this.item('Fromage blanc 0%', fbQty, 'collation_matin'),
          this.item('Pomme',            1,     'collation_matin'),
        ]);
      }
    }

    // ── DÉJEUNER ──────────────────────────────────────────────────────────
    add(this.mainMeal(
      t.proteines * lunchPct,
      t.glucides  * lunchPct,
      'dejeuner', opts, true
    ));

    // ── COLLATION APRÈS-MIDI ──────────────────────────────────────────────
    if (colAprem) {
      if (whey) {
        const wheyQty = this.round((t.proteines * (snackPct / nbSnacks) * 0.75) / (this.FOODS['Whey protéine'].p / 100), 5);
        add([
          this.item('Whey protéine', wheyQty, 'collation_apres_midi'),
          this.item('Pomme',         1,       'collation_apres_midi'),
          this.item('Amandes',       20,      'collation_apres_midi'),
        ]);
      } else {
        const fbQty = this.round((snackEach * 0.55) / (this.FOODS['Fromage blanc 0%'].cal / 100), 25);
        add([
          this.item('Fromage blanc 0%', fbQty,   'collation_apres_midi'),
          this.item('Myrtilles',        100,     'collation_apres_midi'),
        ]);
      }
    }

    // ── DÎNER ─────────────────────────────────────────────────────────────
    add(this.mainMeal(
      t.proteines * dinnerPct,
      t.glucides  * dinnerPct,
      'diner', opts, false
    ));

    // ── COLLATION SOIR ────────────────────────────────────────────────────
    if (colSoir) {
      const skyrQty  = this.round((snackEach * 0.50) / (this.FOODS['Skyr'].cal / 100), 25);
      const mielQty  = snackEach > 200 ? 10 : 5;
      const amendQty = snackEach > 250 ? 20 : 15;
      const chocoQty = snackEach > 300 ? 20 : (snackEach > 200 ? 15 : 0);

      add([
        this.item('Skyr',             skyrQty,  'collation_soir'),
        this.item('Fraises',          100,      'collation_soir'),
        this.item('Miel',             mielQty,  'collation_soir'),
        this.item('Amandes',          amendQty, 'collation_soir'),
      ]);
      if (chocoQty > 0) add([this.item('Chocolat noir 70%', chocoQty, 'collation_soir')]);
    }

    return repas;
  }
};
