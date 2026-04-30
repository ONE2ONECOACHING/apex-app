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
