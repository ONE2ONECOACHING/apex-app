# APEX APP — ONE2ONE Coaching

Application de coaching (nutrition + entraînement + formation) pour les clients de ONE2ONE.
Vanilla JS · Supabase · déployée sur Cloudflare Pages.

---

## 🖥️ Continuer sur un autre PC

Tout le code est sur GitHub. La base de données (Supabase) et l'hébergement
(Cloudflare) sont dans le cloud → **pas besoin de clé USB**.

### 1. Installer (sur le nouveau PC)

| Logiciel | Lien | Pourquoi |
|----------|------|----------|
| **Git** | https://git-scm.com | récupérer / sauvegarder le code |
| **Node.js** | https://nodejs.org | scripts (imports Excel, etc.) |
| **Claude Code** | l'app de coaching IA | continuer à développer |

### 2. Récupérer le projet

```bash
git clone https://github.com/ONE2ONECOACHING/apex-app.git
cd apex-app
```

### 3. Les accès (juste se connecter dans le navigateur)

- **GitHub** : ONE2ONECOACHING — pour `git push` (sauvegarder)
- **Supabase** : https://supabase.com — base de données + Edge Functions
- **Cloudflare** : https://dash.cloudflare.com — se déploie tout seul à chaque `git push`

---

## 🔄 Workflow quotidien

```bash
git pull                 # récupérer les dernières modifs avant de bosser
# ... modifications ...
git add -A
git commit -m "message"
git push                 # sauvegarde sur GitHub → Cloudflare déploie tout seul (~1 min)
```

⚠️ **Toujours faire `git pull` en arrivant** pour éviter les conflits entre les 2 PC.

---

## 🏗️ Architecture

- `index.html` — point d'entrée (charge tous les scripts avec `?v=N` pour le cache)
- `js/` — cœur : `router.js`, `supabase.js`, `ui.js`, `config.js`…
- `pages/client/` — écrans côté client (dashboard, plan, entrainement, formation…)
- `pages/coach/` — écrans côté coach (clients, programmes, bilans, formations…)
- `css/app.css` — styles globaux
- `sql/` — scripts SQL à passer manuellement dans Supabase (migrations, imports)
- `supabase/functions/` — Edge Functions (cron notifications) — **à déployer à la main**
  dans le dashboard Supabase (le `git push` ne les déploie PAS)

### Deux déploiements séparés
1. **App web** → `git push` → Cloudflare déploie automatiquement ✅
2. **Edge Functions** (cron) → copier-coller dans Supabase → Edge Functions → Deploy

### SQL
Les fichiers dans `sql/` se collent dans **Supabase → SQL Editor → Run**.
La plupart sont idempotents (re-lançables sans casse).

---

## 🔗 Liens utiles

- App en ligne : https://app.one2onecoaching.fr
- Repo GitHub : https://github.com/ONE2ONECOACHING/apex-app
- Supabase projet : ahbeturxnnyukkuytesc
