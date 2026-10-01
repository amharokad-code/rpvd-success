# API-MAP — ce que l'app mobile réutilise du backend existant

Le backend **ne change pas** : l'app est un nouveau client de la même API que la PWA
(Netlify Functions + Supabase + Gemini). Cette carte a été produite en lisant le code réel
(`netlify/functions/*`, `supabase_schema.sql`, `src/lib/api.js`), pas de mémoire.

## 1. Authentification et en-têtes

| Élément | Détail |
|---|---|
| Auth | Supabase Auth, **lien magique par courriel** (`signInWithOtp`), aucun mot de passe. L'app reçoit le lien via le deep link `rpvd://auth-callback` ; repli : code à 6 chiffres (`verifyOtp`). |
| Session | JWT Supabase dans `expo-secure-store` (Keychain / Keystore), découpé en morceaux de 1,8 Ko. |
| Header `Authorization` | `Bearer <access_token>` sur toutes les Functions authentifiées. |
| Header `x-device-fingerprint` | SHA-256 hex (64 car.) obligatoire sur `analyze-homework`, `reverify-device`, etc. Mobile : `sha256('rpvd-mobile|OS|modèle|UUID du Keychain')` (voir `src/lib/device.ts`). |
| Format d'erreur | `{ "error": "CODE", "message": "FR" }`, statut HTTP 4xx/5xx. |

## 2. Netlify Functions (POST `…/.netlify/functions/<nom>`)

| Function | Auth | Entrée (JSON) | Réponse 200 | Utilisée par l'app |
|---|---|---|---|---|
| `analyze-homework` | JWT + empreinte | `imageBase64`, `mimeType` (jpeg/png/webp/pdf), `region` | `{ submission_id, credits_remaining, streak_days, analysis, fingerprint_notice? }` — **réponse unique, pas de streaming ni de polling** (Gemini jusqu'à ~26 s) | Écran Analyser |
| `reverify-device` | JWT + empreinte | — | `{ ok: true }` | Bouton « Réattacher cet appareil » (`FINGERPRINT_REVERIFY_REQUIRED`) |
| `age-gate-confirm` | empreinte seule | `market`, `ageConfirmed`, `parentAuthDeclared`, `blocked?` | `{ ok }` (best-effort) | Onboarding (porte d'âge) |
| `track-event` | aucune | `event_type`, `path`, `region?`, `plan?` | `{ ok }` | Analytics first-party (chemins `/m/...`) |
| `delete-account` | JWT | — | `{ ok: true }` | **NOUVEAU** — suppression de compte (exigée par Apple) |
| `revenuecat-webhook` | header `Authorization` = `REVENUECAT_WEBHOOK_AUTH` | événement RevenueCat | `{ received: true }` | **NOUVEAU** — crédite le plan après un achat in-app |
| `create-checkout`, `create-portal-session`, `stripe-webhook` | — | — | — | **Jamais appelées par l'app** (Stripe = web uniquement) |
| `generate-clone`, `exam-preparation`, `start/finish-simulation`, `analyze-tentative`, `activate-code`, `request-trial` | JWT | voir `src/lib/api.js` | — | Pas dans la v1 mobile (voir §6) |

### Objet `analysis` (extrait de `_lib/gemini.js`)

`problem_type`, `subject_guess`, `level_3_steps[{title,text}]`, `final_answer`, `cheminement[{type,text,isFormula}]`,
**Méthode RPVD** : `connu[]`, `cherche`, `demarche`, `principe` ; et, **Pro seulement** (retirés côté serveur
pour Basic) : `hint`, `pitfall`, `consigne_translation`. Les anciennes analyses n'ont pas `demarche` →
l'app retombe sur `level_1` / `level_2`.

### Codes d'erreur gérés par l'app

`NO_CREDITS` (→ paywall), `OCR_FAIL`, `AI_ERROR` (crédit remboursé par le serveur), `RATE_LIMITED`,
`PAYLOAD_TOO_LARGE`, `FINGERPRINT_REVERIFY_REQUIRED`, `FINGERPRINT_MISMATCH`, `UNAUTHORIZED`, `SERVER_ERROR`,
`NETWORK` (client).

## 3. RPC et tables Supabase (RLS : chaque compte ne voit que ses lignes)

| Appel | Rôle |
|---|---|
| `rpc get_my_profile()` | `{ id, email, credits, plan, plan_expires_at, has_fingerprint, preferred_notation, region, streak_days, last_analysis_date, created_at }` — **remplace le `GET /me` du plan : il existait déjà**. Un nouveau compte reçoit 3 crédits (`plan = 'free'`). |
| `rpc set_preferences(p_preferred_notation, p_region)` | Région du compte. |
| `rpc save_submission(p_submission_id, p_subject, p_topic_name)` | « Sauvegarder dans ma bibliothèque » (Pro). |
| `from('submissions').select(…).eq('is_saved', true)` | Bibliothèque (Pro). Colonnes : `id, subject, topic_name, problem_type, analysis, created_at`. |
| `from('push_tokens')` | **NOUVEAU** (`supabase_mobile.sql`) — jetons Expo Push, RLS par utilisateur. |

## 4. Crédits et plans

- Les crédits sont décrémentés **uniquement côté serveur** (`consume_credit`, remboursés si Gemini échoue). L'app n'affiche que `profile.credits`.
- Plans : `free`/`trial` (3 crédits), `basic` (50 crédits / 3 mois, scan seulement), `pro` (120 crédits / 3 mois, tout débloqué). Règle `isProPlan` identique à `src/lib/plan.js`.
- **Achats mobiles** : RevenueCat (abonnements Basic/Pro). Le webhook `revenuecat-webhook` appelle la même RPC `activate_subscription` que Stripe → mêmes plans, mêmes crédits. `EXPIRATION` repasse le plan à `free` (crédits restants conservés, comme à la résiliation Stripe).
- Les anciens **codes d'activation** (`activate-code`) ne sont volontairement pas exposés dans l'app : Apple (guideline 3.1.1) interdit les mécanismes maison de déverrouillage hors achat in-app.

## 5. Écarts assumés par rapport au plan technique initial

| Plan initial | Réalité du projet | Décision |
|---|---|---|
| Auth email + mot de passe | Le backend est **sans mot de passe** (lien magique) | Lien magique + code à 6 chiffres |
| Packs de crédits consommables | Le modèle réel est un **abonnement Basic / Pro tous les 3 mois** | Abonnements RevenueCat (pas de packs) |
| `GET /me` à créer | `get_my_profile` existe | Réutilisé |
| Webhook RevenueCat → « même table que Stripe » | Il n'y a pas de table de crédits séparée : tout vit dans `users` via `activate_subscription` | Même RPC |
| Retry 1× sur 5xx | `analyze-homework` consomme un crédit : un retry aveugle après un délai client pourrait facturer deux fois | **Aucun retry automatique** sur les appels qui consomment un crédit |
| Historique pour tous | Règle business : bibliothèque = Pro | Onglet visible, présentation Pro pour Basic |
| Compression « ~1600 px, JPEG 0,8 » | — | Appliquée (`src/lib/image.ts`) |

## 6. Hors périmètre v1 mobile (existe sur le web, pas encore dans l'app)

Clones d'entraînement, simulation chronométrée, veille d'examen, lecture vocale, notation personnalisée,
photo de tentative (`analyze-tentative`, non validée selon le contrat). Le paywall le dit honnêtement
(« aussi sur le web »). Ce sont les prochaines phases naturelles ; les endpoints existent déjà.
