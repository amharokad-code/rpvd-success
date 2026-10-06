# 08 — Suivi publicitaire (pixels Meta et Snap, API de conversions)

Dernière mise à jour : 5 octobre 2026. Code livré dans le dépôt (non commité). Ce document dit **ce qui est branché**, **quoi coller où**, **comment tester** et **ce qu'il te reste à faire** (identité des plateformes, paiement, collage des clés).

## 1. En une phrase

Rien ne part vers Meta ni Snap sans consentement. Le **pixel du navigateur** ne se charge qu'après « Tout accepter » dans le bandeau de témoins. La **confirmation d'achat envoyée par notre serveur** (API de conversions) ne part que si l'acheteur coche la case facultative, non cochée d'avance, de la page `/reserver`. Sans les variables d'environnement, tout le module est inerte : aucun script, aucun envoi, aucune erreur.

## 2. Schéma des événements

| Événement | Quand | Pixel Meta | Pixel Snap | Serveur (API de conversions) | `event_id` partagé |
|---|---|---|---|---|---|
| Page vue | Chaque chargement d'une page autorisée, après consentement | `PageView` | `PAGE_VIEW` | non | `pv_<uuid>` (au hasard, par chargement) |
| Contenu consulté | Page d'accueil `/` (aussi `/vote`, `/bootcamp`) | `ViewContent` | `VIEW_CONTENT` | non | `vc_<uuid>` |
| Lead | Vote enregistré (réponse OK de `submit-vote`) | `Lead` | `SIGN_UP` (Snap n'a pas de « Lead ») | non | `ld_<uuid>` |
| Début de paiement | Clic sur « Payer 20 $ et réserver » (`/reserver`), avant l'appel au serveur | `InitiateCheckout` | `START_CHECKOUT` | non | `ic_<uuid>` |
| Achat | Page `/merci?e=p_<uuid>` (retour de Stripe) | `Purchase` (20 CAD) | `PURCHASE` (20 CAD) | **oui**, depuis le webhook Stripe, si la case est cochée | `p_<uuid>` (voir ci-dessous) |

**Déduplication de l'achat.** À la réservation, `bootcamp-checkout` fabrique un `p_<uuid>` aléatoire (aucune donnée personnelle). Il est :
1. mis dans les métadonnées Stripe (`ev`) → lu par le webhook → envoyé à Meta (`event_id`) et à Snap (`event_id` + `order_id`) ;
2. ajouté à l'adresse de retour `/merci?s=<session>&e=p_<uuid>` → utilisé par le pixel comme `eventID` (Meta) et `client_dedup_id` + `transaction_id` (Snap).

Meta et Snap voient donc deux messages avec le même identifiant et n'en comptent qu'un. Snap : même identifiant des deux côtés, fenêtre de 48 h (30 jours en repli avec `transaction_id` / `order_id`). Seul l'achat a un double côté serveur ; les autres événements sont envoyés par le pixel seulement.

**Ce que reçoivent les plateformes**

- **Pixel (navigateur)** : nom de l'événement, `value` 20 et `currency` CAD pour l'achat, identifiant du produit (`bootcamp-rpvd`). **Jamais** de courriel ni de nom. Meta est lancé avec `autoConfig` désactivé (pas de correspondance avancée automatique, pas de détection automatique des boutons). Snap est initialisé sans `user_email`. Meta et Snap voient, comme tout site, l'adresse IP et l'agent utilisateur de la requête, et déposent leurs témoins (`_fbp`, `_fbc`, `_scid`).
- **Serveur, case cochée seulement** : montant réellement payé et devise, heure, `event_source_url` (`https://rpvdsuccess.com/merci`), courriel **haché SHA-256** (jamais en clair), IP et agent utilisateur du navigateur de l'acheteur, `fbp` / `fbc` / `ScCid` / `_scid` si présents. Meta : `action_source: website`. Snap : `action_source: WEB`, `sc_click_id`, `sc_cookie1`.
- **Pages où les pixels ne tournent jamais** : `/rembourser?t=…`, `/desabonner?v=…`, `/admin/bootcamp`, `/app`, `/legal/*` (un pixel envoie l'adresse complète de la page : elle contiendrait un jeton personnel). Liste blanche : `/`, `/vote`, `/bootcamp`, `/reserver`, `/merci`, `/accueil`.

## 3. Provenance (attribution)

À l'arrivée, `src/main.jsx` appelle `initAds()` qui lit l'adresse :

| Paramètre | Stockage | Envoyé au serveur |
|---|---|---|
| `src`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | `sessionStorage` (`rpvd_attr`), étiquettes sans lien avec la personne | au vote **et** à la réservation |
| `fbclid`, `ScCid` | `sessionStorage` séparé (`rpvd_click_ids`) ; non gardés si le marketing est déjà refusé ; **effacés** au refus ou au retrait | **seulement** à la réservation, **seulement** si la case est cochée |

Dernier contact gagnant : de nouvelles étiquettes remplacent les anciennes ; une page sans paramètre ne change rien.

Côté serveur (`netlify/functions/_lib/attribution.js`), tout est revalidé : étiquettes limitées à lettres, chiffres, `_ - . : +` et espace, tronquées (40 ou 80 caractères) ; `fbclid`/`ScCid`/`_fbp`/`_fbc`/`_scid` acceptés seulement au format exact ; IP lue côté serveur (jamais fournie par le client) ; agent utilisateur nettoyé et tronqué à 400 caractères.

**Où ça se range (aucun changement de schéma, aucun SQL à lancer).** La colonne `source` existe déjà sur `bootcamp_votes` et `bootcamp_tickets` (texte libre). Elle reçoit maintenant `src|medium|campagne|contenu` (positions fixes, 120 caractères max), par exemple `meta|paid|oct_s1|video-a`, ou `tiktok` si seul `src` est présent. L'écran admin et l'export CSV l'affichent tel quel. Les identifiants de clic ne vont **jamais** dans la base : seulement dans les métadonnées de la session Stripe, et seulement avec la case cochée.

**Gabarit d'adresse à utiliser dans les publicités** (une ligne par annonce, sans espace) :

```
https://rpvdsuccess.com/vote?src=meta&utm_source=instagram&utm_medium=paid&utm_campaign=2026-10-s1&utm_content=video-a
https://rpvdsuccess.com/vote?src=snap&utm_source=snapchat&utm_medium=paid&utm_campaign=2026-10-s1&utm_content=video-a
```

Meta ajoute `fbclid` et Snap ajoute `ScCid` tout seuls.

## 4. Variables d'environnement

Netlify > Site configuration > Environment variables (puis **redéployer**). Les variables `VITE_…` sont lues à la **compilation** : sans nouveau déploiement, elles ne comptent pas. Elles sont publiques (visibles dans la page) : n'y mets **jamais** de jeton.

| Variable | Secret ? | Valeur | Où la trouver |
|---|---|---|---|
| `VITE_META_PIXEL_ID` | non | chiffres (8 à 20) | Events Manager Meta, voir 4.1 |
| `META_PIXEL_ID` | non | même valeur | idem |
| `META_CAPI_ACCESS_TOKEN` | **oui** | longue chaîne | idem (jeton de l'API de conversions) |
| `META_CAPI_TEST_EVENT_CODE` | non | `TEST12345` | idem, onglet « Test Events » ; **temporaire, à retirer après les tests** |
| `META_GRAPH_VERSION` | non | optionnel (défaut `v25.0`) | laisser vide |
| `VITE_SNAP_PIXEL_ID` | non | UUID | Events Manager Snap, voir 4.2 |
| `SNAP_PIXEL_ID` | non | même UUID | idem |
| `SNAP_CAPI_TOKEN` | **oui** | longue chaîne | idem (jeton de l'API de conversions) |
| `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` | secrets | voir section 7 | marketplace.zoom.us |

En local : copie `.env.example` vers `.env` (serveur) et `.env.local` (variables `VITE_…`).

### 4.1 Meta : Events Manager, pas à pas

L'interface change souvent : si un libellé diffère, cherche le mot en gras.

1. Va sur <https://business.facebook.com/events_manager2> (compte Meta Business, vérifié par toi).
2. **Connecter des sources de données** > **Web** > crée un **jeu de données (pixel)** nommé « RPVD Success », avec l'adresse `rpvdsuccess.com`. Choisis l'installation **manuelle** (le code est déjà dans le site) et passe l'assistant sans coller de code.
3. Copie l'**identifiant du jeu de données / pixel** (chiffres) : c'est `META_PIXEL_ID` et `VITE_META_PIXEL_ID`.
4. Onglet **Paramètres** du jeu de données > section **API de conversions** > **Générer un jeton d'accès** (sous « Configurer manuellement »). Copie-le **tout de suite** : c'est `META_CAPI_ACCESS_TOKEN`. Le lien n'apparaît qu'aux personnes qui ont les droits de développeur sur l'entreprise.
5. Toujours dans **Paramètres**, **désactive la correspondance avancée automatique** (« Automatic advanced matching ») et ne branche aucun import de liste de courriels. Le code n'envoie aucun courriel par le pixel ; ce réglage évite que Meta en lise dans les formulaires.
6. Recommandé : vérifie le domaine (Business Settings > Brand Safety > Domains > `rpvdsuccess.com`), utile pour la mesure agrégée des événements.

Source : doc officielle Meta, <https://developers.facebook.com/docs/marketing-api/conversions-api/get-started> (chemin du jeton) et <https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters> (formats `fbc`, `fbp`, `em`).

### 4.2 Snap : Events Manager, pas à pas

1. Dans Snap Ads Manager (compte Business vérifié par toi), ouvre le menu > **Events Manager** > **Create Pixel** (ou choisis ton pixel).
2. Copie le **Pixel ID** (UUID, du genre `0a1b2c3d-…`) : c'est `SNAP_PIXEL_ID` et `VITE_SNAP_PIXEL_ID`.
3. Dans les paramètres du pixel, section **Conversions API** / **CAPI Access Token** : **Create a New Token** > **Generate token**. Copie-le **tout de suite** : c'est `SNAP_CAPI_TOKEN`.
4. Ne colle **aucun** code de pixel dans le site et n'active pas l'import de courriels : le code gère le pixel lui-même.
5. Dans les options du pixel, n'active pas de « correspondance avancée » qui lise les champs de formulaire.

Sources : <https://developers.snap.com/api/marketing-api/Conversions-API/UsingTheAPI> (adresse `https://tr.snapchat.com/v3/{PIXEL_ID}/events`, jeton en paramètre `access_token`), <https://developers.snap.com/api/marketing-api/Conversions-API/Deduplication> (`client_dedup_id` du pixel = `event_id` de l'API), <https://developers.snap.com/api/marketing-api/Conversions-API/Parameters> (champs et noms d'événements), <https://developers.snap.com/api/marketing-api/Conversions-API/VerifySetUp> (outils de test).

## 5. Procédure de test

Fais-la sur un déploiement de prévisualisation Netlify (ou en local avec `netlify dev`), pas sur un vrai achat.

### 5.1 Avant de commencer

1. Colle les variables du tableau 4 dans Netlify, **y compris** `META_CAPI_TEST_EVENT_CODE` (copié depuis Events Manager > ton jeu de données > onglet **Test Events**, ex. `TEST12345`). Tant qu'il est présent, les envois serveur vont dans « Test Events » et ne comptent pas comme vrais : **retire-le avant de lancer les pubs**.
2. Redéploie.
3. Utilise le mode test de Stripe (clés de test sur la prévisualisation, carte d'essai publiée par Stripe `4242 4242 4242 4242`, date future, CVC quelconque) et un webhook Stripe de test qui pointe vers la prévisualisation.

### 5.2 Test des pixels (navigateur)

1. Ouvre `https://<ta-prévisualisation>/vote?src=test&utm_campaign=essai` dans une fenêtre privée.
2. **Avant** de répondre au bandeau, ouvre les outils du navigateur > Réseau : aucune requête vers `facebook.net`, `facebook.com`, `sc-static.net` ni `snapchat.com`. C'est le contrôle le plus important.
3. Clique **Tout accepter** : les scripts se chargent et `PageView` + `ViewContent` partent.
4. Meta : Events Manager > **Test Events** > « Tester les événements du navigateur » > entre l'adresse de la page : tu vois `PageView` et `ViewContent` en direct. Extension utile : Meta Pixel Helper.
5. Snap : Events Manager > ton pixel > **Test Events** (les événements de test apparaissent en 60 secondes environ), ou l'extension Snap Pixel Helper.
6. Soumets un vote : `Lead` (Meta) et `SIGN_UP` (Snap) apparaissent.
7. Sur `/reserver?s=<id>`, clique « Payer » : `InitiateCheckout` / `START_CHECKOUT`.
8. Clique **Gérer mes cookies** au bas de la page > **Nécessaire seulement** : plus aucun événement ne part et les témoins `_fbp`, `_fbc`, `_scid` disparaissent.

### 5.3 Test de l'achat et de la déduplication

1. Fenêtre privée, **Tout accepter**, va sur `/reserver?s=<id>` avec `?src=test&fbclid=` à la fin si tu veux voir `fbc`.
2. Coche les deux cases obligatoires **et** la case facultative « (Facultatif) J'accepte que RPVD informe Meta et Snapchat… ». Paie avec la carte d'essai.
3. Sur `/merci` : l'adresse contient `&e=p_…`. Dans **Test Events** (Meta) tu dois voir **un** `Purchase` avec la source « Navigateur » et **un** avec la source « Serveur », même `event_id`, regroupés/dédupliqués. Dans Snap : un seul `PURCHASE`.
4. Vérifie la **valeur** : 20,00 CAD, et dans les paramètres client le courriel apparaît haché (jamais lisible).
5. Refais l'essai **sans** la case facultative : le pixel peut envoyer son `Purchase` (si tu avais accepté le bandeau), mais **aucun** événement « Serveur » ne doit apparaître. Dans Stripe > Paiements > la session > Métadonnées : pas de `mk`, pas de `client_ip`.
6. Vérifie aussi côté Stripe, avec la case cochée : `mk=1`, `ev`, `fbp`, etc. présents sur la **session** (pas sur le paiement).
7. Rembourse tes paiements d'essai si c'étaient de vrais paiements.

### 5.4 Test de l'API Snap sans envoyer de vraie conversion (facultatif)

Snap offre un point de validation qui n'enregistre rien. Remplace les trois valeurs et lance dans un terminal :

```
curl -X POST "https://tr.snapchat.com/v3/<SNAP_PIXEL_ID>/events/validate?access_token=<SNAP_CAPI_TOKEN>" -H "Content-Type: application/json" -d "{\"data\":[{\"event_name\":\"PURCHASE\",\"event_time\":<EPOCH_SECONDES>,\"event_id\":\"p_test\",\"action_source\":\"WEB\",\"event_source_url\":\"https://rpvdsuccess.com/merci\",\"user_data\":{\"client_user_agent\":\"test\"},\"custom_data\":{\"value\":20,\"currency\":\"CAD\"}}]}"
```

Réponse attendue : `{"status":"VALID", ...}`.

### 5.5 Après les tests

Retire `META_CAPI_TEST_EVENT_CODE`, repasse Stripe en clés réelles, redéploie.

## 6. Ce qui a été trouvé et corrigé à l'audit

1. **Bug de conformité** : `stripe-webhook.js` envoyait déjà un `Purchase` à Meta avec le courriel haché **sans consentement**, pour les abonnements de l'outil d'analyse. Retiré : l'envoi exige maintenant `mk=1` dans les métadonnées, que le tunnel d'abonnement ne collecte pas. Ces achats ne sont donc plus transmis. (Le texte légal affirmait à tort que c'était « légal indépendamment du choix de témoins » : corrigé.)
2. **Achat du Bootcamp jamais envoyé** : la branche `metadata.kind='bootcamp'` ne déclenchait aucun envoi. Maintenant : Meta + Snap, valeur réellement payée (20 CAD), même `event_id` que le pixel, `fbp`/`fbc`/`ScCid`/IP/agent si disponibles, seulement avec la case, seulement à la première confirmation du billet (Stripe réessaie parfois le même événement : un seul envoi).
3. **Version d'API périmée** : `v21.0` dans le code ; défaut passé à `v25.0` (publiée le 18 février 2026), surchargeable par `META_GRAPH_VERSION`. À confirmer dans le tableau de bord développeur Meta si une version plus récente est exigée.
4. **Fuite potentielle** : un pixel posé « partout » aurait envoyé à Meta/Snap les adresses `/rembourser?t=<jeton>` et `/desabonner?v=<id>`. Liste blanche de pages (section 2).
5. **Consentement non retirable** : le bandeau ne pouvait pas être rouvert. Ajout du lien « Gérer mes cookies » (pied de page du Bootcamp).
6. **Envoi non borné** : les deux envois ont un délai maximal de 4 secondes pour ne jamais retenir le webhook.
7. Les métadonnées du **PaymentIntent** ne portent plus que `kind`, `session_id`, `ticket_id` : rien de publicitaire.

## 7. Zoom : vérification et script

**Lecture de bout en bout** (`_lib/zoom.js`, `_lib/bootcamp-ops.js`, `bootcamp-cron.js`, `bootcamp.js`) + 10 tests de la chaîne Zoom et 3 du script, sans réseau (`netlify/functions/__tests__/zoom.test.js`, faux serveur Zoom) :

- Réunion créée par session (inscription automatique, aucun courriel Zoom, un appareil par lien, caméras et micros coupés, aucun enregistrement) : conforme.
- Paiement confirmé > inscription à Zoom > lien personnel stocké ; si Zoom échoue, la tâche planifiée réessaie toutes les 10 minutes jusqu'à 15 minutes après le début ; repli sur le lien collé dans l'admin (non personnel) ; sinon le billet attend, rien n'est marqué envoyé : conforme.
- Calendrier : lien envoyé de T-60 min à T-50 min (tâche toutes les 10 min) : la promesse « 30 à 60 minutes avant » tient. Vérifié pour dimanche 11 octobre 13 h (= 17 h UTC, heure d'été).
- **Deux améliorations** : (a) l'erreur OAuth ne disait que « HTTP 400 », elle inclut maintenant la raison de Zoom (aucun secret dedans) ; (b) variable optionnelle `ZOOM_HOST_EMAIL` si Zoom répond « User does not exist: me » (selon le type d'application, `me` peut ne pas désigner l'hôte). Par défaut, comportement inchangé.

**Quand tu auras collé `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` dans `.env`** :

```
npm run check:zoom -- ton-courriel@exemple.com
```

Le script vérifie le jeton OAuth, crée une réunion test (dans 7 jours), y inscrit ton courriel, affiche **ton lien personnel**, puis supprime la réunion (même en cas d'échec). Chaque cause probable a un message en français : identifiants refusés, Account ID erroné, application de mauvais type, application non activée, **scopes manquants** (liste exacte), hôte introuvable, compte **non Pro**, limite de requêtes, réseau.

Scopes à cocher dans l'application « Server-to-Server OAuth » (Scopes > Add Scopes > Meeting), puis **Activation** :
`meeting:write:meeting:admin`, `meeting:write:registrant:admin`, `meeting:update:registrant_status:admin`, `meeting:delete:meeting:admin`.
Source : <https://developers.zoom.us/docs/integrations/oauth-scopes-granular/>. Réglages du compte (caméras, chat privé…) : `docs/legal/02-ZOOM-PROTECTION-ELEVES.md`.

## 8. Ce qui reste à faire de ton côté (et seulement ça)

1. **Vérification d'identité** Meta Business et Snap Business, création du jeu de données Meta et du pixel Snap (sections 4.1 et 4.2).
2. **Coller les variables** (tableau 4) dans Netlify, **redéployer**, puis suivre la section 5. Retirer `META_CAPI_TEST_EVENT_CODE` ensuite.
3. **Zoom** : créer l'application Server-to-Server, coller les 3 identifiants, lancer `npm run check:zoom -- ton-courriel@exemple.com`.
4. **EFVP** : ajouter Meta et Snap (fournisseurs hors Québec ; données : courriel haché, IP, agent utilisateur, identifiants de clic) à `docs/legal/03-EFVP-FOURNISSEURS.md` et signer.
5. **Désactiver la correspondance avancée automatique** dans les deux Events Manager.
6. **Ciblage** : 14 ans et plus + parents, jamais en dessous de 14 ans (le texte légal et `docs/legal/01-CONFORMITE.md` le disent). Détails dans les fichiers de campagne.
7. Faire relire le texte légal modifié (`src/legal/content.js` : politique de confidentialité, politique de témoins) par un avocat avant de grossir.

## 9. Points d'attention

- **Double consentement, volontairement** : le pixel dépend du bandeau ; l'envoi serveur dépend de la case de `/reserver`. Un acheteur qui a accepté le bandeau mais pas la case est compté par le pixel seulement ; l'inverse est compté par le serveur seulement. Dans ces cas il n'y a rien à dédupliquer.
- Le `Purchase` du pixel sur `/merci` n'est pas vérifié par le serveur (n'importe qui qui connaît une adresse `/merci?e=p_…` pourrait le déclencher pour **lui-même**). Garde-fous : format strict de `e`, une seule émission par onglet. La source de vérité reste l'envoi serveur.
- Un événement déjà transmis ne peut pas être rappelé (c'est dit dans le texte légal). Le retrait après coup passe par `/legal/contact`, plus les outils de suppression de Meta et de Snap.
- Les valeurs envoyées à Meta/Snap avec la case (IP, agent, identifiants) restent dans les métadonnées de la session Stripe aussi longtemps que Stripe garde ce paiement (c'est dit dans le texte légal).
- Les nombres du pixel et ceux de Stripe peuvent différer : bloqueurs de pub, refus du bandeau, achats sans case. Pour le vrai chiffre d'affaires, Stripe fait foi.
- Aucun compteur, aucune rareté, aucun faux chiffre n'a été ajouté nulle part.

## 10. Fichiers du code

Nouveaux : `src/utils/ads-core.mjs` (logique pure), `src/utils/ads.js` (pixels et provenance), `netlify/functions/_lib/attribution.js`, `_lib/ad-conversions.js`, `_lib/snap-capi.js`, `scripts/check-zoom.cjs`, trois fichiers de tests dans `netlify/functions/__tests__/` et un dans `src/utils/__tests__/`.
Modifiés : `_lib/meta-capi.js`, `stripe-webhook.js`, `bootcamp-checkout.js`, `submit-vote.js`, `_lib/zoom.js`, `src/utils/consent.js`, `src/main.jsx`, `BootcampPage.jsx`, `ReserverPage.jsx`, `MerciPage.jsx`, `CookieConsentBanner.jsx`, `BootcampUI.jsx`, `src/config/bootcamp.js`, `src/legal/content.js`, `docs/legal/01-CONFORMITE.md`, `.env.example`, `package.json`.
Commandes : `npm test` (56 tests), `npm run build`, `npm run check:zoom -- courriel`.
