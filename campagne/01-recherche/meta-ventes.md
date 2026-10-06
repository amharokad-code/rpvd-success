# Meta Ads (Facebook + Instagram) 2026 : Bootcamp RPVD à 20 $ CAD

Date de recherche : 2026-10-05. Public : Québec francophone, élèves 14-17 ans + parents.
Légende : [B] source blogue/agence (moins fiable que la documentation Meta); [DROIT] connaissance du droit non relue en ligne dans cette session; [UI] à confirmer dans le Gestionnaire de publicités avant lancement. La documentation officielle Meta n'était pas lisible par l'outil : la plupart des sources sont secondaires.

## 0. Verdict
1. Phase 1 : campagne **manuelle** objectif Ventes (pas Advantage+ sales) : volume trop bas, besoin de contrôle de l'âge (14-17), des exclusions et des dates.
2. Événement d'optimisation : Achat (Purchase) est idéal, mais à un CPA de 8-15 $ il faut 400-750 $/semaine pour 50 achats : irréaliste au départ. Démarrer sur **InitiateCheckout**, passer à Purchase quand Stripe confirme environ 30-50 ventes/semaine.
3. Fenêtre jeu 17 h -> sam 23 h 59 (55 h) : **budget à vie + dates de début/fin**, un ensemble de publicités par semaine (dupliqué à l'identique).
4. Pixel + API de conversions (CAPI), même `event_id`, e-mail haché, `fbp`/`fbc`, **seulement après consentement** (Loi 25).
5. Attribution : garder 7 jours clic + 1 jour vue; la vérité = ventes Stripe.
6. Compte neuf plafonné (environ 50 $/jour au départ [B]); vérification d'identité/entreprise = étape humaine.
7. Opportunity score : ne mesure pas la performance (Meta le dit); appliquer seulement les recommandations utiles.
8. Nommage et UTM standardisés (section 9).

## 1. (a) Advantage+ sales vs manuelle
Faits :
- Advantage+ sales automatise audience, placements, créatifs. Benchmarks d'agences : CPA 12-17 % plus bas, mais avec 50+ conversions/semaine et créatifs variés [B] https://benly.ai/learn/meta-ads/meta-ads-advantage-plus-vs-manual , https://firstlaunch.in/blog/advantage-manual-campaigns-guide-2026/
- Consensus : approche hybride (manuel pour tester et pour le rétargeting, Advantage+ pour passer à l'échelle ce qui marche) [B] https://celorisdesigns.com/blog/meta-advantage-plus-vs-manual-2026-guide , https://karb.ai/blog/meta-advantage-plus-sales-campaigns
- Adolescents : le ciblage des moins de 18 ans se limite à l'**âge et à l'emplacement** (plus de sexe, plus d'activité dans l'appli) https://searchengineland.com/meta-introduces-new-ad-targeting-limits-for-teens-391259

Décision :
| Phase | Campagne | Pourquoi |
|---|---|---|
| Sem. 1-6 | Manuelle, Ventes; ensemble « Parents 35-55 » + ensemble « Élèves 14-17 » | Contrôle de l'âge, exclusions, faible volume |
| Dès 50 achats/sem. stables sur 3-4 sem. | Ajouter Advantage+ sales (environ 30 % du budget) pour les parents | Il lui faut du volume et des créatifs variés |
| Toujours | Rétargeting en manuel | Contrôle des audiences et exclusions |

Piège : les options « Advantage+ audience » peuvent dépasser la tranche d'âge saisie. Pour les élèves, fixer 14-17 comme limite stricte et vérifier [UI]. Jamais de pub destinée aux moins de 13 ans (LPC art. 248, https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-40.1 [DROIT]) et, par règle du projet, jamais sous 14 ans.

## 2. (b) Événement d'optimisation et budget d'apprentissage
Faits :
- Un ensemble doit obtenir environ **50 événements d'optimisation sur 7 jours** depuis sa dernière modification importante; sinon « Apprentissage limité » [B] https://www.cometly.com/post/how-to-improve-facebook-ads-learning-phase , https://admanage.ai/blog/facebook-ads-learning-phase-guide
- Optimiser vers l'événement le plus profond que le volume permet; sous 50/semaine, descendre dans l'entonnoir puis remonter [B] https://www.modernmarketinginstitute.com/blog/how-to-structure-a-meta-ads-campaign-that-exits-the-learning-phase-fast
- Certains guides citent un besoin d'environ 100/sem. pour Ajout au panier (non confirmé par Meta) [B].

Calcul (1 ensemble, 50 événements/semaine) :
| CPA cible Achat | Budget hebdo pour 50 achats | Équivalent quotidien |
|---|---|---|
| 8 $ | 400 $ | 57 $ |
| 12 $ | 600 $ | 86 $ |
| 15 $ | 750 $ | 107 $ |

Avec 20 $ par place, 400-750 $/semaine = 20 à 37 places vendues pour rentrer dans son argent : à ce niveau c'est de l'apprentissage, pas du profit. Plan réaliste :
- **Phase A (sem. 1-4)** : événement = InitiateCheckout (clic sur « Payer » vers Stripe). Hypothèse de travail (à valider, pas un chiffre Meta) : un IC coûte environ 20-35 % d'un achat, donc 50 IC/semaine = environ 100-250 $. Budget de départ suggéré : **150 $/semaine** (budget à vie), ajusté selon le coût réel par IC.
- **Phase B** : quand Stripe confirme au moins 30-50 ventes/semaine (tous canaux), dupliquer l'ensemble en optimisation Purchase.
- `Lead` (vote sur /vote) : utile pour bâtir des audiences, mais déconseillé comme objectif d'achat (attire des votants qui n'achètent pas).
- Ne pas modifier budget/créatif/audience en cours de semaine (relance l'apprentissage).
- Enchère : « plus bas coût » en phase A; « objectif de coût » (ex. 12 $) seulement plus tard.

## 3. (c) Rétargeting et exclusions
Toutes les audiences dépendent du consentement (Loi 25) : sans consentement, pas d'événement, donc audiences plus petites que le trafic réel.
| Audience | Source | Durée | Usage |
|---|---|---|---|
| Visiteurs du site | Pixel `PageView` | 14 j (max 180) | Rétargeting jeu-sam |
| Votants | `Lead` (vote soumis) | 30 j | « Le sujet est choisi, les places ouvrent jeudi » (selon le vrai calendrier) |
| Paiement commencé non terminé | `InitiateCheckout` sans `Purchase` | 7 j | Rappel sam. : ventes closes à 23 h 59 (vrai) |
| Acheteurs | `Purchase` + CAPI | 180 j | **Exclusion** de toute acquisition |
- Exclure les acheteurs de la semaine et du passé sur tous les ensembles d'acquisition.
- Taille minimale d'une audience utilisable : environ 100 personnes [UI]; au début, rétargeting = 20 % du budget au plus.
- Lookalike : trop tôt (trop peu d'acheteurs source); reporter.
- Aucune audience construite à partir de données d'enfants de moins de 14 ans (consentement parental, Loi 25 [DROIT]).

## 4. (d) Calendrier et budget à vie vs quotidien
Faits :
- « Exécuter les publicités selon un calendrier » exige un **budget à vie** au niveau de l'ensemble (pas de grille horaire en budget quotidien) [B] https://madgicx.com/blog/meta-campaign-scheduling , https://www.jonloomer.com/qvt/should-you-use-a-daily-or-lifetime-budget/
- Fuseau du compte publicitaire : le régler sur America/Toronto à la création (non modifiable ensuite) [UI].

Option recommandée (une nouvelle semaine = un nouvel ensemble) :
1. Campagne permanente `RPVD_Ventes_Manuel_QC-FR`.
2. Chaque dimanche/lundi : dupliquer l'ensemble gagnant de la semaine précédente; **début jeudi 17 h 00, fin samedi 23 h 59**, budget à vie (ex. 150 $).
3. Calendrier horaire seulement pour exclure des heures creuses (ex. 0 h-6 h).
4. Aucun ensemble à budget à vie sans date de fin.
Inconvénient : l'algorithme repart à neuf chaque semaine; le pixel et les audiences gardent leurs données. Mitigation : dupliquer à l'identique les gagnants, 1-2 ensembles seulement.
Option B (après 4 semaines, à tester) : ensemble permanent à budget quotidien + règles automatisées (activer jeu 17 h / pauser sam 23 h 59); les règles ne s'exécutent pas à la minute près, donc dépassement possible.
Sécurité : fixer un **plafond de dépense du compte** égal au budget de la semaine (ex. 200 $).

## 5. (e) Pixel, CAPI, déduplication, EMQ, domaine
Faits :
- Même `event_name` et même `event_id` dans le Pixel et la CAPI : Meta compte une fois et garde la version serveur; fenêtre de déduplication 48 h [B] https://datanostro.com/en/docs/learn/meta-capi-deduplication/ ; officiel : https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events
- Event Match Quality (0-10) : e-mail haché, téléphone, `external_id`, `fbp`, `fbc`, IP, user-agent, nom, ville/code postal pèsent le plus https://developers.facebook.com/docs/marketing-api/best-practices/omni-optimal-setup-guide
- Mesure d'événements agrégés : la priorisation de 8 événements et l'onglet dédié ne sont plus requis; la vérification de domaine est recommandée, non obligatoire pour configurer les événements [B] https://www.jonloomer.com/meta-announces-big-changes-to-website-conversion-campaigns/ , https://www.adviso.ca/en/blog/evolution-aggregated-measurement-meta

Implémentation RPVD (Netlify + Stripe) :
- `fbp` = cookie `_fbp`; `fbc` = cookie `_fbc` ou `fb.1.<horodatage_ms>.<fbclid>` construit depuis le paramètre `fbclid` de l'URL. Stocker `fbp`, `fbc`, `fbclid`, IP, user-agent, `event_source_url` dans les métadonnées de la session Stripe Checkout à sa création (seulement si consentement).
- `event_id` : `ic_<uuid>` généré au clic « Payer » (InitiateCheckout, Pixel + CAPI); `purchase_<stripe_session_id>` pour Purchase.
- Purchase envoyé **par CAPI depuis le webhook Stripe** `checkout.session.completed` : `action_source=website`, `value=20.00`, `currency=CAD`, e-mail haché SHA-256 (minuscules, sans espaces). Le navigateur quitte souvent le site pour Stripe, donc le Pixel seul est peu fiable.
- Événements : `PageView`, `ViewContent` (page sujet), `Lead` (vote), `InitiateCheckout`, `Purchase`.
- Sans consentement marketing : n'envoyer **rien** à Meta, même haché (Loi 25; cohérent avec le chargement conditionnel de Google Analytics déjà en place).
- Vérifier rpvdsuccess.com (TXT DNS ou balise meta) : recommandé [B].
- Tester avec Events Manager > Tester les événements avant lancement; viser un EMQ d'au moins 6/10 pour Purchase [UI].

## 6. (f) Attribution, compte neuf, facturation, vérification
- Depuis le 12 janvier 2026, 7 jours-vue et 28 jours-vue sont retirés; restent 1 jour clic, 7 jours clic (défaut), 28 jours clic (comparaison), 1 jour vue, 1 jour vue engagée [B] https://www.dataslayer.ai/blog/meta-ads-attribution-window-removed-january-2026 , https://jetfuel.agency/meta-ads-attribution-settings-2026/
- Réglage : 7 jours clic + 1 jour vue; comparer avec 1 jour clic (achat impulsif sur 55 h). Réconcilier avec Stripe via UTM.
- Plafond quotidien initial d'environ 50 $/jour, relevé vers 250 $ après des paiements réussis; progression typique 3-6 mois [B] https://www.stackmatix.com/blog/meta-ads-minimum-daily-budget-2026 , https://help.eightdigitmedia.com/en/articles/10625050-meta-spending-limit-and-billing-threshold . Notre rythme (environ 50 $/jour effectif) frôle le plafond.
- Seuil de facturation : débits à chaque palier atteint, seuil bas au début puis relevé avec l'historique [B] https://help.dash.fi/integrations/meta/meta-billing-threshold . Paiement = humain.
- Vérification d'identité de l'administrateur de la Page/du compte (au besoin) et vérification d'entreprise recommandée (hausse de limites, récupération de compte) [B] https://www.stackmatix.com/blog/meta-agency-ad-account : tâche humaine.
- L'éducation n'est pas une catégorie publicitaire spéciale [UI].
- Politique Meta sur les mineurs : âge et lieu seulement; aucune promesse de résultats scolaires; pas de contenu jouant sur les insécurités [UI : relire la politique publicitaire].

## 7. (g) Bon score, honnêtement
- Opportunity score (0-100) = part des recommandations adoptées; Meta précise qu'il ne reflète pas la performance réelle ou future [B] https://www.jonloomer.com/opportunity-score/ , https://bir.ch/blog/meta-opportunity-score
- Classements de qualité (qualité, engagement, conversion) : diagnostic relatif aux concurrents [B] https://madgicx.com/blog/meta-ads-performance-scoring
- Méthode honnête : (1) appliquer les recommandations utiles (placements Advantage+, formats 9:16, CAPI, EMQ); (2) refuser celles qui gonflent le budget sans lien avec les ventes; (3) promesse exacte, page d'atterrissage rapide en français; (4) pas d'appât à clics; (5) corriger tout de suite alertes et rejets.
- Pilotage réel : coût par place (dépense Meta / ventes Stripe nettes de remboursements), taux de remboursement, ventes/semaine.

## 8. (h) Structure de test créatif
- 1 campagne, 2 ensembles (Parents / Élèves 14-17), 3-4 annonces chacun. Angles vrais : « le sujet est choisi par le vote »; « 1 h 30 en direct, 20 $ tout inclus »; « remboursement intégral jusqu'à samedi 23 h 59 »; démo d'une méthode RPVD de 20 s.
- Une variable à la fois : angle (sem. 1-2), format Reel 9:16 vs image 4:5 (sem. 3-4), accroche des 3 premières secondes.
- À 150 $/semaine, seules des différences nettes se voient : juger sur au moins 1 000 impressions et 20 clics par annonce, et sur plusieurs semaines; ne pas couper avant 3 jours.
- Hebdo : garder 1-2 gagnantes, remplacer la plus faible.
- Laisser les placements Advantage+ actifs.
- Prix total (20 $ CAD) visible; pas de compteur de places inventé; aucune garantie de note.

## 9. (i) Nommage et UTM
- Campagne : `RPVD_Ventes_Manuel_QC-FR`
- Ensemble : `S41_Parents35-55_IC_BudgetVie150` (S41 = semaine ISO)
- Annonce : `S41_AngleVote_Reel9x16_v2`
- UTM : `?utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}` (macros dynamiques Meta; minuscules, sans accents ni espaces dans les noms; aucune donnée personnelle dans l'URL).
- Conserver `utm_*` et `fbclid` dans les métadonnées Stripe (avec consentement) ou en agrégat anonyme pour le tableau hebdo : dépense Meta / ventes Stripe nettes.

## 10. Risques
- Compte neuf plafonné; risque de refus d'annonce (mineurs, vérification).
- Sans consentement, Pixel/CAPI vides : l'optimisation voit seulement une partie du volume.
- Marge : 20 $ moins frais Stripe (environ 2,9 % + 0,30 $) laisse environ 5-12 $ de marge à un CPA de 8-15 $ : rentabilité immédiate incertaine; traiter le mois 1 comme budget d'apprentissage.
- Sources surtout non officielles : confirmer dans l'UI la limite d'âge stricte, budget à vie + dates, taille minimale d'audience, plafond du compte et politique sur les mineurs.
