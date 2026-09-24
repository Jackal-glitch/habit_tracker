# Ultimate Habit Tracker

Suivi d'habitudes avec graphiques (progression mensuelle, streaks), API serverless
et base PostgreSQL. Fait pour être déployé sur **Vercel**.

## Structure

```
habit-tracker/
├── api/
│   ├── _db.js         # connexion PostgreSQL partagée
│   ├── habits.js      # GET / POST / DELETE des habitudes
│   ├── checks.js      # POST pour cocher/décocher un jour
│   └── dashboard.js   # GET agrège toutes les données du mois
├── index.html
├── style.css
├── app.js
├── schema.sql          # à exécuter une fois sur ta base
└── package.json
```

## 1. Créer une base PostgreSQL

Vercel ne garde pas de fichiers persistants (donc pas de SQLite en prod). Choisis
une option gratuite :

- **Neon** (recommandé, simple) : https://neon.tech → crée un projet → copie la
  "Connection string".
- **Vercel Postgres** (intégré à Vercel, propulsé par Neon) : dans ton projet
  Vercel → onglet *Storage* → *Create Database* → *Postgres*.
- **Supabase** : https://supabase.com → Project Settings → Database → Connection string.

## 2. Initialiser le schéma

Exécute le contenu de `schema.sql` sur ta base (via l'éditeur SQL de Neon/Supabase,
ou en local avec `psql`) :

```bash
psql "$DATABASE_URL" -f schema.sql
```

Cela crée les tables `habits` et `habit_checks`, et insère les 10 habitudes du
template en exemple (tu peux les supprimer/modifier depuis l'interface).

## 3. Configurer la variable d'environnement

Sur Vercel : Project → Settings → Environment Variables → ajoute `DATABASE_URL`
avec la chaîne de connexion de l'étape 1.

En local, copie `.env.example` vers `.env` et remplis `DATABASE_URL`.

## 4. Déployer

```bash
npm install -g vercel   # si pas déjà fait
vercel                  # suit les instructions, ou connecte le repo GitHub sur vercel.com
```

## 5. Développement local

```bash
npm install
vercel dev
```

`vercel dev` sert `index.html` en statique et exécute les fonctions du dossier
`api/` comme sur Vercel, en lisant `.env` automatiquement.

## Fonctionnement

- Chaque habitude a un objectif hebdomadaire (`goal`, ex. "4 fois par semaine").
- Cliquer sur une cellule du tableau quotidien coche/décoche le jour pour cette habitude.
- Le streak (🔥) compte les jours consécutifs cochés jusqu'à aujourd'hui (ou hier).
- Le graphique mensuel affiche le % d'habitudes complétées chaque jour.
- Le donut affiche la progression globale (complété vs restant) sur le mois.

## Personnalisation

- Polices : **Anton** (titres) + **Courier New** (contenu), définies dans `style.css`.
- Couleurs des semaines et des habitudes : variables CSS en haut de `style.css`.
