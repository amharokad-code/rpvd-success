# RPVD Success — État du projet (résumé de transfert)

Dernière mise à jour : 2026-09-23

## 1. C'est quoi

PWA éducative : l'élève prend une photo de son exercice, l'app (React + Gemini) explique le **pattern** derrière la solution en 3 niveaux (générique → avec les vrais chiffres → étape par étape), plutôt que de juste donner la réponse. Slogan : "Pattern > Theory".

## 2. Stack

- **Frontend** : React 19 + Vite + Tailwind CSS v4
- **Backend** : Netlify Functions (Node, CommonJS)
- **Base de données / Auth** : Supabase (Postgres + RLS + Auth par lien magique)
- **IA** : Google Gemini (`gemini-3.1-flash-lite`, thinkingBudget 4096)
- **Paiement** : Stripe Checkout (paiement unique, pas d'abonnement récurrent)
- **Repo** : github.com/amharokad-code/rpvd-success (branche `main`, déploiement auto sur push)

## 3. Hébergement — ⚠️ à lire avant de déployer quoi que ce soit

**Le site a été migré deux fois** à cause de blocages de facturation Netlify (comptes "Free" sans carte, crédits épuisés) :

| Compte | Site | Statut |
|---|---|---|
| `amharokad@gmail.com` | `incandescent-hamster-05d62b.netlify.app` | ❌ Bloqué (ancien) |
| `rpvdsuccess@gmail.com` | `rpvd-success-v2.netlify.app` | ❌ Bloqué (« Account credit usage exceeded ») |
| `badamhton@gmail.com` | **`rpvdsuccess.netlify.app`** | ✅ **Site actuellement en ligne, à utiliser** |

Toutes les pubs / liens partagés doivent pointer vers **`rpvdsuccess.netlify.app`**. Ce site est connecté au dépôt GitHub (déploiement automatique à chaque push sur `main`) — pas besoin de `netlify deploy` manuel sauf pour forcer un rebuild après un changement d'env var.

Si ce 3e compte se bloque à son tour (comportement observé : ça arrive après un usage soutenu sur un compte Free), la vraie solution long terme est d'ajouter un moyen de paiement sur UN des comptes plutôt que de re-migrer indéfiniment — recréer un site prend ~15 min mais chaque migration retouche le webhook Stripe et les redirect URLs Supabase.

Pour forcer un rebuild manuel si besoin :
```bash
npm run build
npx netlify deploy --prod --dir=dist --site <SITE_ID>
```

## 4. Fonctionnalités livrées

- **Auth** : connexion par lien magique (courriel), pas de mot de passe, pas de Google OAuth. Session persistée (`localStorage`).
- **Empreinte d'appareil** : bloque le partage de compte (canvas + WebGL + UA + résolution) — un compte = un appareil, pour toujours.
- **Analyse 3 niveaux + Arbre de Cheminement**, longueur adaptée à la complexité réelle du numéro (pas de taille fixe).
- **Notation personnalisée** : au-dessus de la zone d'upload, texte + photo d'exemple optionnelle envoyée à Gemini.
- **Quadri-langue** : QC / FR / US / UK. Sélecteur complet dans Réglages (grille 2x2), sélecteur compact (drapeau actif + chevron qui déroule les 3 autres) directement sur le dashboard.
- **Bibliothèque** : sauvegarde de RPVD passés, table Supabase `submissions` (`is_saved`), pas de localStorage.
- **Réseaux sociaux** : bandeau non-bloquant `SocialFollowPrompt` avec les vrais liens (Facebook/Instagram/TikTok), fermeture discrète (× transparent, sans cercle).
- **Plans et paiement** (tous testés en réel avec Stripe test mode, carte 4242) :
  - **Solo** : 50 crédits, 1 code, 1 appareil.
  - **Trio** : **3 codes séparés** de 50 crédits chacun (un par personne/appareil) — PAS un compte à 150 crédits partagés.
  - **Premium Solo** : 120 crédits, 1 code, 34,99$ CAD.
  - **Premium Trio** : 3 codes de 120 crédits (360 total), 59,99$ CAD.
  - **Upgrade Base → Premium** : une fois les crédits à 0, offre au paywall qui ne facture que la DIFFÉRENCE de prix (pas le plein tarif Premium). Éligibilité revérifiée côté serveur (compte connecté + forfait de base réel + crédits à 0), jamais sur la foi du client. S'applique directement au compte/appareil existant (pas de nouveau code à activer).
  - Prix affichés : vrai prix total à droite, équivalent mensuel (vert) sous le nom du forfait, dans la devise réelle de la région — plus aucun montant hardcodé en une seule devise.
- **Paywall honnête** : prix réels uniquement, aucune fausse urgence (pas de prix barré, pas de compte à rebours, pas de badge "offre limitée" — retiré pour raisons éthiques/légales).
- **Design "v2"** : fond noir avec grille technique qui dérive lentement + noise, accent orange rendu terne/discret (l'orange vif du logo reste réservé au logo), micro-animations (logo qui flotte), navigation en rail à gauche sur desktop/tablette (icône seule) + barre du bas sur mobile.
- **PWA** : manifest servi avec le bon type MIME (`application/manifest+json`, corrigé via `netlify.toml`), icônes maskable dédiées (safe zone 65%) séparées des icônes normales, service worker avec cache versionné.
- **Tracking** : Meta Conversions API sur le webhook Stripe (événement `Purchase`).

## 5. Base de données (Supabase)

Schéma dans `supabase_schema.sql` à la racine du repo — **idempotent**, peut être rejoué sans danger dans l'éditeur SQL Supabase. Tables : `users` (`plan` inclut maintenant `premium_solo`/`premium_trio`), `submissions`, `activation_codes` (idem), `rate_limits`, `trial_requests`, `security_events`.

RPCs clés : `activate_code`, `consume_credit`, `refund_credit`, `bump_streak`, `create_activation_codes` (verrouillage `pg_advisory_xact_lock` par `stripe_session_id`, génère N codes d'un coup pour Trio), `apply_premium_upgrade` (nouveau — applique l'upgrade Base→Premium directement au compte, idempotent par session Stripe, laisse une trace d'audit dans `activation_codes`), `get_my_profile`, `save_submission`/`unsave_submission`, `set_preferences`.

**Supabase Auth → URL Configuration** doit inclure `https://rpvdsuccess.netlify.app` (Site URL + Redirect URLs) — à vérifier après toute migration Netlify.

## 6. Variables d'environnement (noms, pas les valeurs)

Configurées sur `rpvdsuccess.netlify.app` : `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_AI_STUDIO_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

**Toujours manquantes** (jamais configurées, sur aucun des 3 sites successifs) : `RESEND_API_KEY`, `EMAIL_FROM`, `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`. Sans `RESEND_API_KEY`, **aucun courriel ne part** (codes d'essai, codes premium, confirmation d'upgrade) — c'est le trou le plus important restant.

## 7. Secrets exposés en clair dans l'historique de conversation

Chaque fois qu'un secret est apparu dans une sortie d'outil (obligatoire pour le configurer), l'utilisateur en a été informé sur le coup. Liste cumulative à régénérer par prudence si une revue de sécurité est faite un jour : clé service Supabase, clé Gemini, clé secrète Stripe (test), plusieurs secrets de webhook Stripe successifs (un par migration de site), le personal access token Netlify du compte `badamhton@gmail.com`.

## 7bis. Phase 1 — fonctionnalités d'entraînement (RPVD_FEATURES_PROMPT.md)

Implémentées et testées en direct contre l'API Gemini réelle (schémas validés, réponses cohérentes) :

- **Indice / piège / traduction de consigne** : ajoutés au même appel Gemini que l'analyse principale (`hint`, `pitfall`, `consigne_translation` dans `analysis`), affichés en repli (`<details>`) dans `AnalysisEngine.jsx`.
- **Générateur de clones** (`generate-clone.js`, `ClonePractice.jsx`) : génère un exercice au même pattern, texte seul (pas de photo), consomme 1 crédit, stocké dans `submissions.clones`.
- **Mode vocal** (`TextToSpeech.jsx`) : Web Speech API, aucun appel serveur, langue pilotée par la région.
- **Simulation chronométrée** (`start-simulation.js`, `finish-simulation.js`, `SimulationMode.jsx`) : pratique gratuite sur les clones déjà générés, RPC `start_simulation`/`finish_simulation`.
- **Veille d'exam** (`exam-preparation.js`, `ExamPrep.jsx`, nouvel onglet nav) : liste les 5 patterns les plus probables d'un examen, consomme 1 crédit.
- **Métriques Gemini** (`ANALYSIS_METRIC` dans les logs Netlify + colonne `submissions.gemini_metrics`) : modèle, latence, tokens, coût estimé par appel — chercher `ANALYSIS_METRIC` dans les logs pour affiner le budget de réflexion par tâche.

**⚠️ Photo de tentative** (`analyze-tentative.js`) : câblée et fonctionnelle techniquement, mais **jamais validée** — le contrat exige de vérifier le diagnostic sur 20 vraies copies d'élèves (E.M.A. ou autre) avant d'exposer un bouton public. Ne pas lancer cette feature publiquement sans cette validation manuelle, qu'un agent ne peut pas fabriquer lui-même.

**Migration SQL requise** : `supabase_schema.sql` a grandi (colonnes `clones`/`gemini_metrics` sur `submissions`, tables `clone_attempts`/`simulations`, RPCs `start_simulation`/`finish_simulation`) — rejouer le fichier complet dans l'éditeur SQL Supabase avant que ces routes fonctionnent en prod (idempotent, sans risque).

## 8. Ce qui reste en suspens

- **`RESEND_API_KEY` / `EMAIL_FROM`** : à configurer en priorité, sinon aucun courriel ne part (blocage business réel, pas juste cosmétique).
- **Meta Ads** : `META_PIXEL_ID`/`META_CAPI_ACCESS_TOKEN` à configurer, puis vérifier dans Meta Events Manager qu'un achat test remonte. La campagne elle-même doit être créée manuellement dans Meta Ads Manager (jamais fait depuis Claude Code, par design — aucun token d'accès API collé dans le chat).
- **Domaine personnalisé** : envisager pour ne plus dépendre d'un sous-domaine `.netlify.app` qui change à chaque migration de compte.
- **Robustesse du compte Netlify** : si `rpvdsuccess.netlify.app` (compte `badamhton@gmail.com`) se bloque aussi, la vraie solution est d'ajouter un moyen de paiement plutôt que de migrer une 4e fois.
