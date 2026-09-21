# RPVD Success — État du projet (résumé de transfert)

Dernière mise à jour : 2026-09-21

## 1. C'est quoi

PWA éducative : l'élève prend une photo de son exercice, l'app (React + Gemini) explique le **pattern** derrière la solution en 3 niveaux (générique → avec les vrais chiffres → étape par étape), plutôt que de juste donner la réponse. Slogan : "Pattern > Theory".

## 2. Stack

- **Frontend** : React 19 + Vite + Tailwind CSS v4
- **Backend** : Netlify Functions (Node, CommonJS)
- **Base de données / Auth** : Supabase (Postgres + RLS + Auth par lien magique)
- **IA** : Google Gemini (`gemini-3.1-flash-lite`, voir §5)
- **Paiement** : Stripe Checkout (paiement unique, pas d'abonnement récurrent)
- **Repo** : github.com/amharokad-code/rpvd-success (branche `main`, déploiement auto)

## 3. Hébergement — ⚠️ point le plus important

**Deux comptes Netlify existent** :

| Compte | Site | Statut |
|---|---|---|
| `amharokad@gmail.com` | `incandescent-hamster-05d62b.netlify.app` | **Bloqué** — crédits gratuits du compte épuisés, déploiements refusés |
| `rpvdsuccess@gmail.com` | **`rpvd-success-v2.netlify.app`** | ✅ **Site actuellement en ligne, à utiliser** |

Toutes les pubs / liens partagés doivent pointer vers **`rpvd-success-v2.netlify.app`**. Le CLI local est actuellement connecté au compte `rpvdsuccess@gmail.com`.

Pour redéployer après un changement de code :
```bash
npm run build
npx netlify deploy --prod --dir=dist --functions=netlify/functions
```
(Le déploiement Git-auto existe aussi mais dépend des crédits du compte lié au repo — vérifier lequel est actif avant de compter dessus.)

## 4. Fonctionnalités livrées

- **Auth** : connexion par lien magique (courriel), pas de mot de passe, pas de Google OAuth. Session persistée (`localStorage`), testée en conditions réelles.
- **Empreinte d'appareil** : bloque le partage de compte (canvas + WebGL + UA + résolution).
- **Moteur D** : analyse 3 niveaux + **Arbre de Cheminement** (séquence de bulles concept/action à droite du texte).
- **Notation personnalisée** : juste au-dessus de la zone d'upload, toggle "Y'a-t-il une notation en particulier ?" → texte + photo d'exemple optionnelle (envoyée à Gemini pour cette analyse seulement, jamais stockée).
- **Quadri-langue** : QC / FR / US / UK, ton et ordre de matière propre à chacun.
- **Drapeaux** : SVG maison (Canada+Québec, France, US, UK) — les emojis Unicode ne s'affichent pas fiablement sous Windows/Chrome.
- **Prix multi-devises** : CAD 17,54$/33,74$, USD 12,99$/24,99$, EUR 11,82€/22,74€, GBP 10,13£/19,49£ (Solo/Trio), testé avec de vraies sessions Stripe dans les 4 devises.
- **Paywall honnête** : prix réels uniquement, **aucune fausse urgence** (retiré : prix barré, compte à rebours, badges "offre limitée" — risque légal LPC identifié et corrigé).
- **Gamification** : streak (flamme), crédits, bibliothèque de RPVD sauvegardés.
- **Rebrand "Pyramid Ascension"** : fond noir pur, orange `#f2994a`/`#e07b2e` (remplace l'ambre Tailwind), Space Grotesk pour les titres, logo pleine largeur en bannière, favicons régénérés à partir du vrai pictogramme fourni.
- **Tracking** : Meta Conversions API sur le webhook Stripe (événement `Purchase`, valeur/devise réelles, email haché SHA-256).

## 5. Le gros incident du jour — chaîne de modèles Gemini

Trois causes de pannes en prod, trouvées et corrigées **dans cet ordre**, chacune confirmée dans les vrais logs Netlify (pas des suppositions) :

1. **`maxOutputTokens` trop bas** (2048) après l'ajout du champ `cheminement` au schéma JSON → réponse tronquée → 502 systématique. Monté à 8192.
2. **Pas de vrai filet de sécurité** : la chaîne de repli listait `gemini-2.5-flash`/`1.5-flash`/`2.0-flash`, tous en réalité **404 "no longer available to new users"** pour cette clé. Un seul modèle marchait vraiment.
3. **Cause racine finale** : `gemini-3.6/3.7/3.5-flash` (et `flash-latest`) sont des modèles trop récents/preview, en surcharge quasi permanente chez Google (503 "high demand", 7-30s de latence même quand ils répondent).

**Solution retenue** : chaîne 100% `flash-lite` (modèle établi, faible demande) :
```
gemini-3.1-flash-lite → gemini-flash-lite-latest → gemini-3.1-flash-lite-preview
```
Testé 6/6 succès sur deux séries indépendantes avec le vrai payload (vision + schéma JSON complet), 1-3.5s à chaque fois. Le fallback bascule aussi maintenant sur 503/429/timeout (pas juste 404 comme avant), et le timeout par modèle est réduit à 12s (deux essais tiennent sous la limite d'exécution Netlify).

`thinkingConfig.thinkingBudget: 4096` ajouté en plus — même modèle, juste plus de temps de réflexion interne avant de répondre (demandé explicitement).

## 6. ⚠️ Sécurité — à faire dès que possible

Des clés ont été **accidentellement affichées en clair** dans le chat pendant la session (erreur de ma part — tentative de masquage ratée sur une commande) :
- Clé service Supabase (`SUPABASE_SERVICE_KEY`)
- Clé Gemini (`GOOGLE_AI_STUDIO_API_KEY`)
- Clé secrète Stripe **test** (`sk_test_...` — risque limité, pas de vrai argent)
- Secret webhook Stripe

**Recommandé** : régénérer ces 3-4 clés (Supabase → Project Settings → API ; Google AI Studio ; Stripe → API keys) et les remettre à jour sur Netlify (`npx netlify env:set CLE "nouvelle_valeur"`), sur le site `rpvd-success-v2`.

## 7. Variables d'environnement (noms, pas les valeurs)

Configurées sur `rpvd-success-v2` : `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_AI_STUDIO_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

**Encore à configurer sur ce site** (existaient sur l'ancien compte, pas migrées) : `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Sans `RESEND_API_KEY`, les courriels (codes d'essai/premium) ne partent pas en prod.

## 8. Base de données (Supabase)

Schéma dans `supabase_schema.sql` à la racine du repo — idempotent, peut être rejoué sans danger. Table `users`, `submissions`, `activation_codes`, RPCs `consume_credit`/`refund_credit`/`bump_streak`/`get_my_profile`/`set_preferences`/etc.

**Supabase Auth → URL Configuration** : Site URL et Redirect URLs doivent inclure `https://rpvd-success-v2.netlify.app` (déjà fait).

## 9. Ce qui reste en suspens

- Migrer les variables d'environnement manquantes (§7) vers `rpvd-success-v2`.
- Rotation des clés exposées (§6).
- Décider si on retourne un jour sur l'ancien compte Netlify (crédits se renouvellent le 17 octobre) ou si `rpvd-success-v2` devient définitif — envisager un domaine personnalisé pour ne plus dépendre du sous-domaine `.netlify.app`.
- Campagne Meta Ads (ciblage QC parents/élèves) : jamais configurée depuis Claude Code (accès API refusé par design — jamais de token collé dans le chat), à faire manuellement dans Meta Ads Manager.
