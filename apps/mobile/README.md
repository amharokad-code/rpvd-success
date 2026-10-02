# RPVD Success — app native iOS + Android (Expo / React Native)

Vraie application native (pas une PWA), même backend que le site : Netlify Functions + Supabase + Gemini.
Voir `docs/API-MAP.md` pour ce qui est réutilisé et les écarts assumés.

**Stack** : Expo SDK 57 · React Native 0.86 · TypeScript strict · Expo Router (`src/app/`) ·
Supabase Auth (jetons dans le Keychain/Keystore) · RevenueCat (achats in-app) · expo-notifications ·
EAS Build / Submit / Update.

## Lancer en développement

```bash
cd apps/mobile
cp .env.example .env        # puis remplir (valeurs publiques uniquement)
npm install                 # .npmrc force legacy-peer-deps (conflit de peers React connu)
npx expo start --dev-client # nécessite un development build (voir ci-dessous)
npm run typecheck           # tsc --noEmit
```

`react-native-purchases`, `expo-notifications` et `expo-secure-store` ont du code natif : **Expo Go ne suffit pas**.
Premier build de développement (cloud, sans Mac) :

```bash
npx eas-cli@latest login
npx eas-cli@latest init                     # crée le projet EAS, écrit extra.eas.projectId dans app.json
npx eas-cli@latest build --profile development --platform android   # puis ios (compte Apple requis)
```

> Le dossier est dans le dépôt du site web, qui a son propre `node_modules` (autre version de React) :
> `expo-doctor` signale un « doublon React » local. C'est sans effet sur les builds EAS (qui n'installent
> que `apps/mobile`) ; ne pas « corriger » en modifiant `metro.config.js`.

## Architecture

```
src/app/           routes (Expo Router) : onboarding, (auth)/login, (tabs)/{index,history,account}, analysis/[id], paywall
src/context/       AppContext (région + onboarding), AuthContext (session + profil + RevenueCat), AnalysisStore
src/lib/           api.ts (Functions + RPC), supabase.ts, storage.ts (SecureStore par morceaux), device.ts (empreinte),
                   image.ts (capture + compression), purchases.ts (RevenueCat), push.ts, track.ts, plan.ts
src/components/    ui.tsx (primitives), AnalysisView.tsx (3 niveaux), MathFiche.tsx (rendu LaTeX : WebView + KaTeX embarqué, hors ligne), LegalLinks.tsx
```

Principes : l'app **ne crédite jamais rien** (le serveur est la source de vérité) ; **jamais d'appel direct à
Gemini** ; **aucun prix en dur** ni lien Stripe dans l'app (règles Apple/Google) ; aucune donnée collectée avant la
porte d'âge ; bibliothèque / indice / pièges / consigne réservés à Pro (même règle que le web, appliquée aussi
côté serveur).

## Ce qui reste à faire de TON côté (comptes, argent, consoles)

Rien de cela ne peut être fait par du code. Dans l'ordre :

1. **Comptes développeur** : Apple Developer Program (99 $ US/an) et Google Play Console (25 $ US, une fois).
2. **Expo / EAS** : `eas login` puis `eas init` (écrit le `projectId` dans `app.json`). Changer au besoin les
   identifiants `com.rpvdsuccess.app` (iOS `bundleIdentifier` et Android `package`) **avant le premier build**
   — ils sont définitifs une fois l'app publiée.
3. **Supabase** → Authentication → URL Configuration → **Redirect URLs** : ajouter `rpvd://auth-callback`.
   Puis, pour que le code à 6 chiffres fonctionne, ajouter `{{ .Token }}` au modèle de courriel « Magic Link ».
4. **Supabase** → SQL Editor : exécuter `supabase_mobile.sql` (table `push_tokens`).
5. **App Store Connect / Play Console** : créer 2 abonnements auto-renouvelables de **3 mois** —
   `rpvd_basic_3m` et `rpvd_pro_3m` (le nom doit contenir `basic` / `pro`) — mêmes IDs des deux côtés.
   S'inscrire au **Small Business Program** d'Apple (15 % au lieu de 30 %).
6. **RevenueCat** : projet + apps iOS/Android, produits rattachés à une **Offering** « current » avec les 2
   packages, clés SDK publiques copiées dans `.env` (`EXPO_PUBLIC_REVENUECAT_*_KEY`) puis dans les EAS Secrets.
   Webhook : URL `https://<site>.netlify.app/.netlify/functions/revenuecat-webhook`, champ *Authorization* =
   la valeur de `REVENUECAT_WEBHOOK_AUTH` (déjà définie dans Netlify).
7. **Fiches des stores** : icône (déjà générée), captures d'écran (6,7" iOS + téléphone Android), questionnaire de
   classification, URL de politique de confidentialité (`/legal/privacy` existe), **compte démo** pour
   l'évaluateur Apple, déclaration « données collectées ».

## Checklist pré-soumission

- [ ] Icône 1024×1024 sans transparence ✔ (`assets/icon.png`), splash, captures d'écran
- [ ] URL politique de confidentialité en ligne ✔ (liée dans l'app : onboarding, connexion, paywall, compte)
- [ ] Suppression de compte in-app fonctionnelle ✔ (`delete-account`, testée en direct)
- [ ] « Restaurer mes achats » dans le paywall ✔
- [ ] Aucune mention de Stripe / paiement externe dans l'app ✔
- [ ] Compte démo pour l'évaluateur Apple (à créer + saisir dans App Store Connect)
- [ ] Test sur un vrai iPhone (TestFlight) **et** un vrai Android (piste interne)
- [ ] Un achat sandbox complet testé de bout en bout (RevenueCat → webhook → plan Pro dans l'app)

## Builds et publication

```bash
npm run build:preview                       # APK/IPA internes pour tests
npm run build:prod                          # builds de production (autoIncrement)
npm run submit:ios && npm run submit:android
npx eas-cli@latest update --branch production --message "..."   # correctif JS sans review des stores
```

## Coûts et délais

Apple 99 $ US/an · Google 25 $ US unique · EAS gratuit pour démarrer · RevenueCat gratuit jusqu'à 2 500 $/mois
suivis · commission des stores 15 % (petites entreprises). Review Apple : quelques jours.

## Rendu LaTeX (Moteur D v2)

Les fiches `niveaux[]` sont rendues par `MathFiche` : une WebView par niveau affiché, KaTeX embarqué
(`src/lib/katexSource.ts`, généré — `node scripts/build-katex-asset.cjs` après une mise à jour de `katex`),
sortie MathML, aucun réseau. `react-native-webview` a du code natif : il faut un nouveau development build.
