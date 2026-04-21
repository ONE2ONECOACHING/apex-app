// APEX APP — Calculs TDEE (Mifflin-St Jeor + METs)

const TDEE = {
  jobFactors: { sedentaire: 1.2, leger: 1.375, actif: 1.55, tres_actif: 1.725 },

  METS: {
    'Musculation': 3.5, 'Course à pied': 8.0, 'Vélo (modéré)': 7.5,
    'Circuit cardio': 8.5, 'CrossTraining / HIIT': 9.0, 'Natation': 7.0,
    'Football': 8.0, 'Padel': 7.5, 'Tennis': 7.3, 'Boxe / Arts martiaux': 9.5,
    'Yoga / Stretching': 2.5, 'Randonnée': 6.0, 'Basket / Sports collectifs': 8.0,
    'Cyclisme (intense)': 10.0, 'Marche rapide': 4.5, 'Elliptique': 5.0,
    'Escalade': 8.0, 'Danse / Zumba': 6.5
  },

  calculate(profile, activites) {
    const { sexe, age, poids, taille, type_metier, pas_par_jour, objectif } = profile;

    // BMR — Mifflin-St Jeor
    const bmr = sexe === 'homme'
      ? 10 * poids + 6.25 * taille - 5 * age + 5
      : 10 * poids + 6.25 * taille - 5 * age - 161;

    // NEAT
    const factor = this.jobFactors[type_metier] || 1.2;
    const neat = bmr * (factor - 1) + (pas_par_jour || 5000) * 0.04;

    // EAT
    let eatWeek = 0;
    if (activites && activites.length) {
      activites.forEach(a => {
        const met = a.met || this.METS[a.sport] || 5;
        eatWeek += met * poids * (a.duree_minutes || 45) / 60;
      });
    }
    const eat = eatWeek / 7;

    // TDEE
    const tdee = Math.round(bmr + neat + eat);

    // Objectif
    let targetKcal;
    if (objectif === 'perte') targetKcal = tdee - 350;
    else if (objectif === 'masse') targetKcal = tdee + 250;
    else targetKcal = tdee;

    // Macros
    const proteines = Math.round(poids * 2.0);
    const lipides = Math.round(targetKcal * 0.25 / 9);
    const glucides = Math.max(50, Math.round((targetKcal - proteines * 4 - lipides * 9) / 4));

    return {
      bmr: Math.round(bmr),
      neat: Math.round(neat),
      eat: Math.round(eat),
      tdee,
      targetKcal,
      proteines,
      glucides,
      lipides
    };
  },

  // Masse grasse US Navy
  bodyFat(sexe, taille, tourTaille, tourCou) {
    if (!tourTaille || !tourCou || !taille) return null;
    let pct;
    if (sexe === 'homme') {
      pct = 495 / (1.0324 - 0.19077 * Math.log10(tourTaille - tourCou) + 0.15456 * Math.log10(taille)) - 450;
    } else {
      pct = 495 / (1.29579 - 0.35004 * Math.log10(tourTaille - tourCou) + 0.22100 * Math.log10(taille)) - 450;
    }
    return Math.max(5, Math.min(50, Math.round(pct * 10) / 10));
  }
};
