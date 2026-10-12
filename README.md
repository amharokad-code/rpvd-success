# RPVD

Capsules vidéo RPVD vendues aux parents (pivot du 2026-10-12, concept verrouillé jusqu'au 1er janvier 2027). L'application d'analyse (`/app`) reste un bonus de fidélisation. Historique technique : `PROJECT_HANDOFF.md`.

## Produits (CAD, paiement unique)

Capsule Concept 24 $ · Capsule Examen 29 $ (+ code d'essai PWA 30 jours) · Bootcamp en direct 99 $ (+ code d'essai PWA, 25 places max par session).

## Hébergement vidéo : VdoCipher

- Choix : VdoCipher garde le DRM (Widevine/FairPlay), le filigrane dynamique (courriel + date, en mouvement) et un jeton de lecture à courte durée, générés côté serveur (`netlify/functions/_lib/playback.js`) pour un acheteur vérifié. Pas de bouton de téléchargement.
- Suivi par utilisateur : le lecteur est une iframe contrôlée par son API JavaScript (`VdoPlayer`), la page lit `currentTime` toutes les 10 s et l'envoie à `my-capsules` (`progress`). Un segment est « complété » à 90 % vu. Pas besoin des webhooks de l'hébergeur.
- Sous-titres : à activer dans le tableau de bord VdoCipher (génération automatique en français ou fichier .vtt téléversé), puis cocher « sous-titres ajoutés » dans l'admin. Publier une capsule l'exige.
- **Limite connue :** aucune page web ne peut bloquer totalement la capture d'écran. Le DRM donne une image noire sur la plupart des appareils, mais un téléphone qui filme l'écran passe toujours. Le filigrane avec le courriel de l'acheteur est la vraie dissuasion.

## Modèle de données (supabase_schema.sql, idempotent, RLS partout)

Le cahier d'engagement parle de `products`, `purchases`, `bootcamp_sessions` : ils correspondent aux tables existantes pour éviter les doublons.

| Cahier | Table | Note |
|---|---|---|
| products | `capsules` | `date_examen` = vraie date d'examen de l'école |
| capsule_segments | `capsule_segments` | un segment = un type de numéro, `exercice_correction_rpvd` livrée après « J'ai essayé » |
| purchases | `orders` | `parent_attested_at`, `consentement_courriels`, `consentement_horodatage`, `status` (active/revoked) |
| watch_progress | `watch_progress` | clé (achat, segment) : un élève par achat |
| bootcamp_sessions | `bootcamps` | capacité plafonnée à 25 (la table `bootcamp_sessions` existante est l'ancien produit hebdomadaire) |
| (nouveau) | `capsule_requests`, `email_events`, `engagement_events`, `email_optouts`, `capsule_devices` | demandes, doublons de courriels, désabonnements, 2 appareils par courriel |

## Parcours

Achat sur `/capsules/:slug` (attestation parent obligatoire, courriels de suivi facultatifs, non cochés) → webhook Stripe crée la commande, le code PWA, un lien magique à usage unique → `/mes-capsules` → `/capsule/:slug` (segments, « Commence ici », exercice, compte à rebours vers la vraie date d'examen, plan suggéré) → `/suivi` (vue parent, lecture seule).

Courriels au parent (`engagement-cron`, quotidien, seulement si consentement et non désabonné) : J+1 non commencé, progression, J-3, fin, invitation Bootcamp à J-5 sous 50 %. Séquence des demandes de capsule : `capsule-cron`.

Admin `/admin` (ADMIN_EMAILS vérifié côté serveur) : demandes par sujet, capsules, segments, commandes, bootcamps, mesures d'engagement.

## Variables d'environnement ajoutées

`ADMIN_EMAILS`, `VDOCIPHER_API_SECRET`, `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_DEMO_VIDEO_URL`, `CAPSULE_J1_ENABLED` (facultative). Déjà présentes : Supabase, Stripe, Resend (`RESEND_API_KEY`, `EMAIL_FROM`), `URL`.

Ne jamais coller une clé dans une conversation ni dans le dépôt : `npx netlify env:set NOM valeur --site <ID du site>`.

## Vérifications

```bash
npm test            # unitaires, RLS du schéma, logique d'engagement
npm run build && npm run audit:dist   # aucune clé secrète dans dist/
npm audit --audit-level=high
```

## Déploiement

Le site en ligne est branché sur GitHub (déploiement à chaque push sur `main`). Avant : rejouer `supabase_schema.sql` dans l'éditeur SQL Supabase et définir les variables ci-dessus. Vérifier l'ID du site Netlify cible (voir `PROJECT_HANDOFF.md` §3) avant tout `netlify deploy`.
