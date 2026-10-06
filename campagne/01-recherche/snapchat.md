# Snapchat Ads 2026 pour le Bootcamp RPVD (Québec) — rapport de recherche

Date : 2026-10-05. Niveau de confiance : [V] = vérifié sur source citée, [T] = source tierce (blogue), à revalider dans Ads Manager, [À VALIDER] = non confirmé par ma recherche.

## 1. Constat honnête (lire d'abord)
- Snapchat sert surtout à atteindre les 15-17 ans. Les parents y sont moins présents : pour eux, prévoir Meta (autre rapport). Ici : Snap = ados, avec un message qui les pousse à en parler à leur parent.
- Le produit vaut 20 $ : l'optimisation « Ventes » n'aura presque jamais assez de conversions pour « apprendre ». On commence donc par Trafic, puis on passe à Ventes seulement si les achats s'accumulent (voir §8).
- La règle européenne retire plusieurs options de ciblage pour les 13-17 ans en UE/R.-U./Suisse [V]. Je n'ai PAS trouvé de page officielle donnant la liste exacte des options disponibles pour les 13-17 au Canada : [À VALIDER] dans Ads Manager à la création (options grisées = indisponibles).

## 2. Objectifs de campagne (depuis août 2024 : 5 au lieu de 12) [T]
Sensibilisation et engagement ; Trafic (site web / app) ; Prospects (Leads) ; Promotion d'app ; Ventes (conversions web + catalogue).
Sources : https://admanage.ai/blog/snapchat-ads-manager-guide ; https://www.socialmediatoday.com/news/snapchat-simplifies-ad-campaign-set-up-process/723908/
- Tout guide qui présente « Website Conversions » comme objectif autonome date d'avant 2024.
- Pour nous : Trafic (étape 1), Ventes (étape 2). Prospects (formulaire intégré à Snap) : à éviter, collecte de données de mineurs (Loi 25).

## 3. « Swipe Up » : devenu quoi ?
- Le geste de glissement a été remplacé par un bouton d'appel à l'action (CTA) sur lequel on appuie ; Snap ajoute le CTA quand une pièce jointe (attachment) est configurée : ne rien placer d'important dans cette zone [T]. Sources : https://forbusiness.snapchat.com/advertising/ad-formats ; https://developers.snap.com/marketing-api/Ads-API/creatives
- Boutons (API) : MORE (« En savoir plus »), SHOP_NOW, SIGN_UP, BOOK_NOW, APPLY_NOW, etc., selon le type de pièce jointe [V, API]. Libellés français exacts dans l'interface : [À VALIDER].
- Choix recommandé : « En savoir plus » (MORE) ou « S'inscrire » (SIGN_UP). Éviter « Acheter » pour des mineurs : le parent paie.
- Pièce jointe : « Site web » (Web View) vers la page de vote ou la page du Bootcamp.

## 4. Formats et specs
| Format | Usage pour nous | Specs |
|---|---|---|
| Snap Ad (vidéo ou image, plein écran) | Format principal | 9:16, 1080×1920 px ; vidéo MP4/MOV (H.264), 3 à 180 s (3-10 s recommandé), moins de 32 Mo préféré, max 1 Go ; zones libres : 150 px en haut, 330 px en bas ; nom de marque 25 car. max, titre 34 car. max [T] |
| Story Ad | À tester plus tard | séquence de visuels 9:16 [T] |
| Collection | Inutile (catalogue produits) | image/vidéo + 4 vignettes [V] |
| Commercials (non sautables) | Trop cher / inutile | [T] |
| Sponsored Snaps (clavardage) | À éviter pour mineurs | restrictions propres au chat [T] |
| Lens / Spotlight | Hors budget | — |
Sources : https://strikesocial.com/blog/snapchat-ad-specs/ ; https://blog.adnabu.com/snapchat/snapchat-ad-specs/ ; https://alladspecs.com/specs/snapchat/snap-ad-video
Top Snap : [À VALIDER] (non confirmé par ma recherche).

## 5. Pixel et API de conversions (CAPI)
- Événements standards : PURCHASE, SIGN_UP, ADD_CART, START_CHECKOUT, VIEW_CONTENT, PAGE_VIEW, SUBSCRIBE, etc., plus CUSTOM_EVENT_1 à 5 [V]. Source : https://developers.snap.com/marketing-api/Conversions-API/Parameters
- Déduplication Pixel et CAPI : même `event_id` des deux côtés ; côté Pixel, `client_dedup_id` (hors achat) ou `transaction_id` (achat) ; fenêtre de 48 h [V]. Source : https://developers.snap.com/marketing-api/Conversions-API/Deduplication
- Pour RPVD : PURCHASE envoyé par le webhook Stripe (CAPI, côté serveur Netlify) avec `event_id` = identifiant de la session Checkout Stripe ; même valeur en `transaction_id` côté Pixel sur la page de succès. Devise CAD, valeur 20.00.
- Droit : le Pixel Snap est un traceur marketing, donc chargé SEULEMENT après consentement (même mécanisme que Google Analytics déjà en place, Loi 25). Sans consentement : aucun appel vers Snap. Pour un achat fait par un parent, ne jamais transmettre de données de l'élève mineur (recommandation) ; n'envoyer un courriel haché que si le consentement couvre cet usage.
- Conséquence : mesure sous-estimée (refus de témoins). Stripe reste la source de vérité ; ajouter `utm_source=snapchat` aux liens.

## 6. Ciblage (Québec, ados 15-17)
- Âge : par année, dès 13 ans [T]. Règle du projet : jamais sous 15 ans dans les annonces. Snap rejette les pubs destinées aux moins de 13 ans [V] (https://www.snap.com/ad-policies) ; la Loi sur la protection du consommateur (art. 248) impose le même plancher.
- Lieu : province du Québec ; code postal/FSA possible [T]. Langue : français [T].
- Intérêts : études, examens, mathématiques ; libellés exacts [À VALIDER].
- Audiences personnalisées et Lookalike 1/5/10 % existent [T] (https://benly.ai/learn/snapchat-ads/snapchat-ads-targeting-options) mais NE PAS les utiliser pour les 15-17 ans : listes de courriels = données personnelles, et volume trop faible. Taille minimale de la source d'un Lookalike : [À VALIDER].
- Pour les 13-17 en UE/R.-U./Suisse : pas de genre, audiences prédéfinies, personnalisées, etc. [V] (https://businesshelp.snapchat.com/s/article/gdpr?language=en_GB). Hors Québec, mais indique la direction : rester sur un ciblage large (âge + lieu + langue).
- Parents (35-54, Québec, français, statut parental [T]) : audience petite sur Snap ; budget minimal, à reporter sur Meta.

## 7. Enchères et budgets
- Budget minimal : 5 $/jour par ensemble d'annonces ; Snap recommande 20-50 $/jour pour la phase d'exploration (environ 4 jours) [T]. Sources : https://novoads.ai/en/blog/snapchat-ads-cost ; https://hackceleration.com/labs/snapchat-pricing
- Stratégies : Auto-enchère, Coût cible, Enchère max, ROAS min. (exige le suivi d'achat) [T]. Pour les objectifs de conversion, l'enchère est un objectif et non un plafond strict [T].
- Référence tierce : CPM environ 8 $ US, clic environ 0,90 $ US (juin 2025, un seul échantillon) [T]. Ne pas s'y fier pour budgéter.
- Attribution par défaut : 28 jours clic / 1 jour vue ; option 7/0 [T]. Utiliser 7 jours clic / 0 vue (achat de 20 $ décidé vite).

## 8. Structure recommandée
Budget de test : 10 $/jour pendant la fenêtre de vente (jeudi 17 h à samedi 23 h 59), soit environ 30 $. Honnêtement, trop court pour l'apprentissage de Snap : l'objectif de la première semaine est de mesurer coût par clic et taux d'achat, pas d'optimiser.

Campagne 1 : « RPVD – Ados – Trafic »
- Objectif : Trafic (site web). Optimisation : visites de la page de destination si offerte, sinon clics.
- Ensemble A1 : Québec, 15-17 ans, français, ciblage large, placements automatiques, 5 $/jour, Auto-enchère.
- Ensemble A2 : même public, autre créatif (message « vote + parle-en à ton parent »), 5 $/jour. Test de créatif, pas d'audience.
- 2 annonces par ensemble : vidéo 9:16 de 6-10 s, texte à l'écran, pièce jointe vers rpvdsuccess.com/vote (lun-mer) ou la page du Bootcamp (jeu-sam), bouton « En savoir plus ».

Campagne 2 (seulement si 10 achats Stripe attribuables ou plus en 2 semaines) : « RPVD – Ventes »
- Objectif Ventes (conversions web), événement PURCHASE, CAPI + Pixel dédupliqués, attribution 7/0.
- Public : parents 35-54 Québec (ensemble séparé, jamais mélangé aux ados) + reciblage des visiteurs ayant consenti.

Message à l'ado (le parent paie) : page claire avec sujet, prix total (20,00 $ tout inclus), remboursement libre-service jusqu'à samedi 23 h 59, et un moyen de partager le lien à un parent (fonction à vérifier sur le site : [À VALIDER]). Ne jamais demander une carte à l'ado.

## 9. Politiques et examen
- Interdits : annonces fausses ou trompeuses (promesses, fonctionnalités), attentes irréalistes ; pages d'atterrissage de mauvaise qualité (liens morts, non adaptées au mobile) [V]. Source : https://www.snap.com/ad-policies
- Éducation : aucune section dédiée dans la page consultée [V]. Éviter toute promesse de note ou de réussite. Dire plutôt « 1 h 30 en direct pour comprendre la démarche ».
- Pas de délai d'examen officiel trouvé ; Snap se réserve le droit de refuser/retirer [V]. Soumettre 24-48 h avant le jeudi 17 h (délai réel : [À VALIDER]).
- Profil public Snapchat requis pour annoncer en 2026 [T]. Vérification d'identité de l'annonceur : faite par l'humain.
- Modération : surveiller les réponses ; aucune messagerie ouverte avec des mineurs depuis l'annonce.

## 10. Conformité Québec/Canada (non revérifiée sur les textes officiels dans cette recherche : [À VALIDER] par le volet droit)
- Publicité en français ; prix total (20,00 $ CAD, taxes et frais compris) affiché.
- Aucun ciblage sous 15 ans ; consentement parental sous 14 ans (Loi 25).
- LCAP/CASL : aucun message commercial issu de la pub sans consentement explicite.
- Aucun faux compteur ; seul « 90 places maximum par salle » est vrai et utilisable.

## 11. Sources
https://admanage.ai/blog/snapchat-ads-manager-guide ; https://www.socialmediatoday.com/news/snapchat-simplifies-ad-campaign-set-up-process/723908/ ; https://www.snap.com/ad-policies ; https://businesshelp.snapchat.com/s/article/gdpr?language=en_GB ; https://developers.snap.com/marketing-api/Conversions-API/Parameters ; https://developers.snap.com/marketing-api/Conversions-API/Deduplication ; https://developers.snap.com/marketing-api/Ads-API/creatives ; https://strikesocial.com/blog/snapchat-ad-specs/ ; https://novoads.ai/en/blog/snapchat-ads-cost ; https://benly.ai/learn/snapchat-ads/snapchat-ads-targeting-options
