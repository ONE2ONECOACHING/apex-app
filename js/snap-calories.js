// APEX APP — Snap Calories (analyse photo via proxy Cloudflare)

function extractJSON(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }
  throw new Error("Réponse IA illisible. Réessaie avec une photo plus nette.");
}

const SnapCalories = {
  async analyze(base64Image, context, portions, planMacros) {
    // Construire le prompt avec le contexte du plan nutritionnel
    let prompt = "Tu es un expert en nutrition et coach sportif. Analyse cette photo de repas.\n";
    prompt += "Contexte : " + context + ". Portions : " + portions + ".\n\n";

    if (planMacros) {
      prompt += "OBJECTIFS MACROS DU CLIENT POUR LA JOURNÉE :\n";
      prompt += "- Calories : " + planMacros.calories_cible + " kcal\n";
      prompt += "- Protéines : " + planMacros.proteines_cible + "g\n";
      prompt += "- Glucides : " + planMacros.glucides_cible + "g\n";
      prompt += "- Lipides : " + planMacros.lipides_cible + "g\n";
      if (planMacros.consumed) {
        prompt += "\nDÉJÀ CONSOMMÉ AUJOURD'HUI :\n";
        prompt += "- Calories : " + planMacros.consumed.calories + " kcal\n";
        prompt += "- Protéines : " + planMacros.consumed.proteines + "g\n";
        prompt += "- Glucides : " + planMacros.consumed.glucides + "g\n";
        prompt += "- Lipides : " + planMacros.consumed.lipides + "g\n";
      }
      prompt += "\nDonne un feedback personnalisé en tenant compte de ces objectifs et de ce qui a déjà été consommé.\n\n";
    }

    prompt += 'Réponds UNIQUEMENT en JSON valide, sans texte autour, sans backticks :\n';
    prompt += '{"dish_name":"Nom du plat","description":"Description courte des composants visibles (1-2 phrases)",';
    prompt += '"calories_total":650,"proteins_g":35,"carbs_g":55,"fats_g":25,';
    prompt += '"confidence":75,';
    prompt += '"note":8,';
    prompt += '"feedback":"Feedback personnalisé : ce qui est bien dans ce repas, ce qui pourrait être amélioré par rapport aux objectifs macros, conseil concret pour le prochain repas (2-3 phrases max)",';
    prompt += '"tip":"Conseil nutritionnel court et direct adapté à ce plat (1 phrase)"}\n\n';
    prompt += 'La note est sur 10 : 10 = parfaitement aligné avec les objectifs, 1 = très éloigné.\n';
    prompt += 'Si ce n\'est pas un plat alimentaire : {"error":"Aucun plat détecté."}';

    const res = await fetch(APP_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: APP_CONFIG.AI_MODEL,
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!res.ok) {
      const ed = await res.json();
      throw new Error(ed.error && ed.error.message ? ed.error.message : 'Erreur ' + res.status);
    }

    const data = await res.json();
    const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const parsed = extractJSON(raw);

    if (parsed.error) throw new Error(parsed.error);
    return parsed;
  },

  // Lire un tableau de valeurs nutritionnelles sur une étiquette/emballage
  async analyzeLabel(base64Image) {
    const prompt = `Tu es un expert en nutrition. Analyse ce tableau de valeurs nutritionnelles (étiquette, emballage, plat préparé).
Extrais les valeurs POUR 100g (ou 100ml si boisson). Utilise la colonne "pour 100g" si plusieurs colonnes existent.

Réponds UNIQUEMENT en JSON valide, sans texte autour, sans backticks :
{"product_name":"Nom du produit","calories_100g":350,"proteins_100g":25,"carbs_100g":40,"fats_100g":8}

Si le tableau n'est pas lisible ou absent : {"error":"Tableau nutritionnel illisible ou absent."}`;

    const res = await fetch(APP_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: APP_CONFIG.AI_MODEL,
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!res.ok) {
      const ed = await res.json();
      throw new Error(ed.error?.message || 'Erreur ' + res.status);
    }
    const data = await res.json();
    const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const parsed = extractJSON(raw);
    if (parsed.error) throw new Error(parsed.error);
    return parsed;
  },

  // Analyser la carte d'un restaurant et recommander les meilleurs plats
  async analyzeMenu(base64Image, profile) {
    let prompt = `Tu es un coach nutrition expert. Voici la photo de la carte d'un restaurant.\n\n`;

    if (profile) {
      const obj = { perte: 'perte de poids', maintien: 'maintien', masse: 'prise de masse' };
      prompt += `PROFIL NUTRITIONNEL DU CLIENT :\n`;
      prompt += `- Objectif : ${obj[profile.objectif] || profile.objectif || 'non défini'}\n`;

      if (profile.calories_cible) {
        prompt += `\nOBJECTIFS JOURNALIERS :\n`;
        prompt += `- Calories : ${profile.calories_cible} kcal\n`;
        prompt += `- Protéines : ${profile.proteines_cible}g | Glucides : ${profile.glucides_cible}g | Lipides : ${profile.lipides_cible}g\n`;
      }

      if (profile.consumed && (profile.consumed.calories > 0 || profile.consumed.proteines > 0)) {
        const c = profile.consumed;
        const reste = {
          calories:  Math.max(0, (profile.calories_cible  || 0) - c.calories),
          proteines: Math.max(0, (profile.proteines_cible || 0) - c.proteines),
          glucides:  Math.max(0, (profile.glucides_cible  || 0) - c.glucides),
          lipides:   Math.max(0, (profile.lipides_cible   || 0) - c.lipides),
        };
        prompt += `\nDÉJÀ CONSOMMÉ AUJOURD'HUI :\n`;
        prompt += `- Calories : ${Math.round(c.calories)} kcal | Protéines : ${Math.round(c.proteines)}g | Glucides : ${Math.round(c.glucides)}g | Lipides : ${Math.round(c.lipides)}g\n`;
        prompt += `\nRESTANT POUR CE REPAS (à couvrir) :\n`;
        prompt += `- Calories : ~${Math.round(reste.calories)} kcal | Protéines : ~${Math.round(reste.proteines)}g | Glucides : ~${Math.round(reste.glucides)}g | Lipides : ~${Math.round(reste.lipides)}g\n`;
        prompt += `\nBase tes recommandations sur ce qui reste à consommer pour la journée, pas sur les objectifs totaux.\n`;
      }

      prompt += `\n`;
    }

    prompt += `Analyse cette carte et recommande les 2 ou 3 meilleurs plats selon l'objectif.
Si tu ne vois pas de macros sur la carte, estime-les en fonction du type de plat.

Réponds UNIQUEMENT en JSON valide, sans texte autour, sans backticks :
{
  "restaurant": "Type de restaurant détecté (ex: Brasserie française, Sushi, etc.)",
  "top": [
    {
      "nom": "Nom exact du plat",
      "raison": "Pourquoi c'est un bon choix (1 phrase)",
      "macros": "Estimation courte (ex: ~500 kcal · protéines élevées)",
      "best": true
    }
  ],
  "a_eviter": {
    "nom": "Nom d'un plat à éviter",
    "raison": "Raison courte (ex: très riche en graisses)"
  },
  "conseil": "Conseil pratique pour ce repas au restaurant (1 phrase)"
}

Si la photo n'est pas une carte de restaurant : {"error": "Je ne vois pas de carte de restaurant dans cette photo."}`;

    const res = await fetch(APP_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: APP_CONFIG.AI_MODEL,
        max_tokens: 900,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!res.ok) {
      const ed = await res.json();
      throw new Error(ed.error?.message || 'Erreur ' + res.status);
    }
    const data = await res.json();
    const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const parsed = extractJSON(raw);
    if (parsed.error) throw new Error(parsed.error);
    return parsed;
  },

  // Générer le récap de fin de journée
  async generateDailyRecap(planMacros, consumed, entries) {
    const prompt = `Tu es un coach nutrition bienveillant et direct. Fais le récap de la journée de ton client.

OBJECTIFS :
- Calories : ${planMacros.calories_cible} kcal | Consommé : ${consumed.calories} kcal
- Protéines : ${planMacros.proteines_cible}g | Consommé : ${consumed.proteines}g
- Glucides : ${planMacros.glucides_cible}g | Consommé : ${consumed.glucides}g
- Lipides : ${planMacros.lipides_cible}g | Consommé : ${consumed.lipides}g

REPAS DE LA JOURNÉE :
${entries.map(e => `- ${e.nom} : ${e.calories} kcal (P:${e.proteines}g G:${e.glucides}g L:${e.lipides}g)`).join('\n')}

Réponds UNIQUEMENT en JSON :
{"note":8,"titre":"Titre court du récap (ex: Bonne journée !)","resume":"Récap global en 2-3 phrases : points forts, points à améliorer, conseil pour demain","emoji":"😊"}`;

    const res = await fetch(APP_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: APP_CONFIG.AI_MODEL,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) throw new Error('Erreur récap');
    const data = await res.json();
    const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    return extractJSON(raw);
  }
};
