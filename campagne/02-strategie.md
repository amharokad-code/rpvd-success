# Stratégie de campagne Meta + Snapchat : Bootcamp RPVD

Rédigée le 2026-10-05 (lundi, semaine ISO 41). Aucune action externe n'a été faite : recherche web et fichiers locaux seulement.
Légende : [V] vérifié sur la source citée ; [T] source tierce (blogue, agence) ; [H] hypothèse de travail, sans donnée propre, à remplacer par les chiffres réels ; [UI] à confirmer à l'écran dans Ads Manager ; [A] point juridique à faire valider.

---

## 0. Verdict honnête (à lire d'abord)

1. Aucune campagne ne peut garantir « la meilleure performance » ni un score parfait. Le but ici : appliquer les bonnes pratiques mesurables (structure propre, mesure fiable, créatifs conformes, décisions fondées sur des seuils écrits d'avance).
2. À 20 $, la marge de contribution par billet est d'environ 17,50 $ (section 4). Avec des hypothèses prudentes, le premier achat provenant d'un trafic froid coûtera probablement plus que cela (scénario central : environ 45-50 $ par billet). La pub est donc, au départ, un investissement d'apprentissage à perte plafonnée, pas un moteur rentable. Elle ne devient rentable que si (a) le coût par vote est bas, (b) les votants achètent par courriel (canal gratuit), et/ou (c) les acheteurs reviennent d'une semaine à l'autre. Ces trois points sont des hypothèses [H] à mesurer.
3. Plan retenu : 150 $/semaine au total pendant 3 cycles (perte maximale acceptée : 450 $), puis décision selon des seuils écrits (section 10). Sous environ 100 $/semaine, les données sont trop maigres pour apprendre quoi que ce soit : ne pas lancer plus petit.
4. Contrainte de conformité qui change la mécanique : les moins de 18 ans ne sont jamais retargetés par les plateformes, aucun courriel ni donnée d'élève ne part vers Meta ou Snap, et aucun pixel ne se charge avant un consentement actif. Cela réduit le volume de signal (donc l'optimisation sera moins précise) : c'est un choix assumé, pas un oubli.
5. Le volume d'apprentissage (environ 50 événements par semaine et par ensemble) est hors de portée avec ces budgets. La stratégie le contourne honnêtement avec des paliers d'événements (section 3.4), une structure consolidée (peu d'ensembles) et en jugeant la performance sur Stripe, pas sur l'étiquette « Apprentissage limité ».

---

## 1. Décisions structurantes (tranchées)

| # | Décision | Raison | Source |
|---|---|---|---|
| D1 | Meta : campagnes manuelles, objectif Ventes, pas d'Advantage+ sales au départ | Volume trop bas ; il faut contrôler l'âge, les exclusions et les dates | research/meta-ventes.md [T] ; https://benly.ai/learn/meta-ads/meta-ads-advantage-plus-vs-manual |
| D2 | Parents (18+) = priorité d'achat : 100 % du budget de la fenêtre de vente Meta. Les ados servent à voter (alimenter la liste) et à transmettre l'offre au parent | Le parent paie ; l'ado achète rarement lui-même | Règle du projet |
| D3 | Ados : ciblage Meta par âge (14-17) et lieu seulement, aucun intérêt, aucune audience personnalisée, aucun retargeting, pas d'Advantage+ audience (il ne permet pas de choisir moins de 18 ans) | Restrictions Meta pour les moins de 18 ans ; prudence LPC art. 248 et Loi 25 | https://searchengineland.com/meta-introduces-new-ad-targeting-limits-for-teens-391259 ; https://novoads.ai/en/blog/how-to-target-audiences-in-meta-ads ; https://www.auditsocials.com/blog/meta-teen-ad-targeting-restrictions-parental-controls-2026-age-gated-campaigns [T] |
| D4 | « Retargeting des votants » = courriel Resend (consentement exprès LCAP, déjà automatisé : « Ton sujet a été SÉLECTIONNÉ » jeudi 17 h). « Retargeting des visiteurs » = Meta, adultes 25-60 ans seulement, après consentement au pixel | Les votants sont surtout des mineurs : aucun téléversement de courriels, aucune audience de mineurs | research/droit-qc.md §2.3 |
| D5 | Pixel (navigateur) seulement après consentement « publicité » actif, séparé de l'analytique, désactivé par défaut. Purchase déclenché sur /merci. API de conversions (CAPI) sans courriel : phase 2, après EFVP signée et validation juridique | Loi 25 art. 8.1 ; le rapport droit-qc classe CAPI avec courriel haché « INTERDIT » pour des mineurs | research/droit-qc.md §3 lignes 3, 11, 12 |
| D6 | Événement d'optimisation par paliers : Lead (vote) / InitiateCheckout (parents) → ViewContent en secours → Purchase à 40 ventes/semaine → Advantage+ sales (parents seulement) à 50 ventes/semaine stables | Volume | Section 3.4 |
| D7 | Budget à vie par ensemble avec dates de début et de fin, un ensemble neuf dupliqué chaque semaine | « Exécuter selon un calendrier » exige un budget à vie | https://madgicx.com/blog/meta-campaign-scheduling [T] |
| D8 | Ventes lancées jeudi 17 h 30 (pas 17 h 00) | La sélection tourne par tâche planifiée toutes les 10 minutes : à 17 h 00 le site peut encore afficher l'ancienne semaine | docs/academie/01-SYSTEME-ET-CHECKLIST.md |
| D9 | Snapchat : ados seulement, objectif Trafic d'abord ; campagne Ventes préparée mais activée seulement après 10 achats attribuables en 14 jours | Snap n'a presque jamais assez de conversions à 20 $ ; parents peu présents sur Snap | research/snapchat.md |
| D10 | Aucun compteur de places, aucune fausse rareté. Seuls faits utilisables : 90 places max par salle, ventes fermées samedi 23 h 59, remboursement jusqu'à samedi 23 h 59, 20 $ tout inclus, sujet choisi par vote | Loi sur la concurrence art. 74.01 ; politiques Meta/Snap | research/droit-qc.md §1.2 |

---

## 2. Parcours « le parent paie » (trois chemins, tous mesurés)

1. Parent direct : pub Meta parents (fil Facebook/Instagram) -> page d'accueil rpvdsuccess.com (sessions du dimanche, prix, remboursement) -> /reserver -> Stripe. C'est le chemin prioritaire (100 % du budget Meta de la fenêtre de vente).
2. Ado -> vote -> courriel : pub ados (Reels/Stories, Meta et Snap) -> /vote -> vote gratuit (courriel, avec attestation « 14 ans et plus ou parent ») -> courriel jeudi 17 h « SÉLECTIONNÉ » ou « pas ce dimanche » -> l'ado transmet au parent.
3. Ado -> partage : pub ados « Envoie ça à ton parent » (Snap en fenêtre de vente) -> page d'accueil -> bouton « Envoyer à un parent » -> le parent ouvre le lien (`src=partage-parent`).

Dépendances techniques (à livrer côté site, pas par l'humain) : bouton « Envoyer à un parent » (partage natif du navigateur, copie du lien ou courriel pré-rempli, avec `?src=partage-parent`) ; ligne dans le courriel « SÉLECTIONNÉ » : « C'est ton parent qui paie : transmets-lui ce courriel » ; aucune carte demandée à un élève ailleurs que chez Stripe. Le texte de l'ado ne dit jamais « Achète » : il dit « montre ça à ton parent ».

---

## 3. Mesure, consentement et événements

### 3.1 Règle de consentement (non négociable)
- Bandeau avec une case « Publicité (Meta, Snap) » distincte de l'analytique, décochée par défaut. Sans clic actif : aucun script Meta/Snap, aucune requête vers leurs domaines, aucun témoin `_fbp`/`_fbc`.
- Attestation au vote : « J'ai 14 ans ou plus, ou je suis le parent » (déjà en place). Sous 14 ans, le consentement relève du parent (Loi 25) : aucune annonce n'est conçue pour eux.
- Paramètres à désactiver dans Events Manager (Meta) et dans le gestionnaire Snap : mise en correspondance avancée automatique (sinon les courriels saisis dans /vote ou Stripe seraient hachés et envoyés), configuration automatique d'événements (clics de boutons) [UI].
- Hors consentement : mesure par UTM + `src` + comptage serveur agrégé (votes et billets par source). Stripe reste la source de vérité.

### 3.2 Événements (Pixel navigateur, phase 1)
| Événement | Quand | Paramètres | event_id |
|---|---|---|---|
| PageView | Toute page, après consentement | aucun | automatique |
| ViewContent | Ouverture de /reserver?s=... | content_name = slug de la session, content_category = bootcamp | `vc_<uuid>` |
| Lead | Vote soumis avec succès sur /vote | aucun paramètre personnel | `lead_<uuid>` |
| InitiateCheckout | Clic « Payer » (avant la redirection vers Stripe) | value 20.00, currency CAD, num_items 1 | `ic_<uuid>` |
| Purchase | Chargement de /merci?session_id=... (une seule fois, protégé par stockage de session) | value 20.00, currency CAD, num_items 1 | `purchase_<stripe_session_id>` |
| PartageParent (personnalisé) | Clic sur « Envoyer à un parent » | aucun | `share_<uuid>` |

Snap (même logique, après consentement) : PAGE_VIEW, VIEW_CONTENT, SIGN_UP (= vote), START_CHECKOUT, PURCHASE avec `transaction_id` = identifiant de la session Stripe [V : https://developers.snap.com/marketing-api/Conversions-API/Deduplication].

### 3.3 API de conversions (phase 2, conditionnelle)
Activer seulement quand : EFVP signée avec Meta et Snap ajoutés, politique de confidentialité à jour, adresse postale en ligne, validation juridique des points [A]. Contenu : même `event_name` et même `event_id` que le Pixel (déduplication sur 48 h [T : https://datanostro.com/en/docs/learn/meta-capi-deduplication/]), `fbp`, `fbc`, IP, user-agent, aucun courriel, uniquement si le consentement publicité est enregistré dans les métadonnées Stripe. Conséquence honnête : la qualité de correspondance des événements (EMQ) restera basse (visée réaliste : 4 ou plus sur 10, pas 6) ; on ne l'augmente pas en envoyant des données personnelles. Le courriel haché ne sera réévalué qu'après avis juridique, et jamais pour un acheteur dont l'âge est inconnu sans base claire.

### 3.4 Paliers d'événements d'optimisation (contourner le manque de volume sans tricher)
Fait : un ensemble a besoin d'environ 50 événements d'optimisation par semaine pour sortir de l'apprentissage [T : https://www.cometly.com/post/how-to-improve-facebook-ads-learning-phase]. Pour 50 achats à un CPA de 12 $ il faudrait 600 $/semaine : hors de portée.

| Palier | Événement | Utilisé pour | On y reste jusqu'à... |
|---|---|---|---|
| 1 (départ) | Lead (vote) pour l'ensemble ados ; InitiateCheckout pour parents et retargeting | Plus d'événements que Purchase, proche de l'achat | Passage à 0 si Events Manager montre moins de 10 InitiateCheckout sur 14 jours pour l'ensemble parents |
| 0 (secours) | ViewContent (page /reserver) | Donner du volume quand IC est trop rare | Retour au palier 1 quand IC dépasse 15 sur 14 jours |
| 2 | Purchase | Optimiser sur la vraie vente | Entrée quand Stripe confirme au moins 40 ventes par semaine attribuées aux pubs (`src=pub-*`) pendant 2 semaines consécutives |
| 3 | Advantage+ sales, 30 % du budget Meta, parents 18+ seulement | Passer à l'échelle | Entrée à 50 ventes par semaine stables sur 3-4 semaines. Jamais pour les ados |

Mesures d'accompagnement : consolider (3 ensembles Meta par semaine au maximum), ne rien modifier en cours de fenêtre (dupliquer à l'identique), audience large pour ne pas fragmenter, juger sur le coût par place Stripe et non sur l'étiquette « Apprentissage limité », qui sera affichée et qu'on accepte. Tout ce qui est « événement vu par Meta » est une sous-estimation (consentement partiel).

---

## 4. Économie unitaire (CAD)

### 4.1 Marge de contribution par billet
| Ligne | Montant | Note |
|---|---|---|
| Prix payé | 20,00 $ | tout inclus ; aucun frais ajouté au paiement |
| Frais Stripe | -0,88 $ | 2,9 % x 20 + 0,30 $ [T : https://www.venn.ca/resources/how-to-save-on-your-stripe-payments-for-canadian-businesses ; tarif officiel https://stripe.com/en-ca/pricing non relu] ; +0,8 % si carte étrangère, +2 % si conversion de devise [T] |
| Fuite par remboursements (8 % de billets remboursés, cible inférieure à 10 %) | -1,60 $ | les frais ne sont probablement pas remboursés par Stripe [À CONFIRMER dans le tableau de bord Stripe] |
| Coûts variables (Zoom, Resend, base de données) | environ 0 $ | coûts fixes en pratique |
| **Marge de contribution** | **environ 17,50 $** | avant frais fixes et avant le temps des fondateurs (non compté, non rémunéré) |

Frais fixes (indicatifs) : Resend Pro 20 USD/mois (le forfait gratuit plafonne à 100 courriels par jour : la sélection du jeudi à tous les votants le dépassera vite) [V : https://resend.com/pricing.md] ; Zoom Pro environ 13,33 USD/mois en facturation annuelle, 100 participants (la salle de 90 + l'animateur tient) [T : https://www.eesel.ai/en/blog/zoom-pricing]. Taux de change supposé [H] : 1 USD = 1,38 CAD. Total environ 46 $/mois (environ 11 $/semaine), jusqu'à environ 110 $/mois si Netlify et Supabase passent à des forfaits payants (non vérifié). À 30 billets par semaine : moins de 1 $ par billet.

Sensibilité aux taxes : si le service est taxable (TPS/TVQ) et que le prix de 20 $ les inclut, la marge tombe à environ 15 $. Le tutorat scolaire est présenté comme exonéré par au moins un concurrent (https://www.successcolaire.ca/en/resources/blogs/tax-credit-for-tutoring) : [À CONFIRMER avec un comptable].

### 4.2 Seuils de CPA (coût par place payée, net de remboursements)
| Seuil | Valeur | Sens |
|---|---|---|
| CPA d'équilibre (1er achat) | environ 17 $ | marge de contribution moins l'amortissement des frais fixes à 30 billets/semaine |
| CPA cible durable | 12 $ ou moins | marge d'environ 5,50 $ par billet (environ 31 %) |
| CPA toléré en apprentissage | jusqu'à 35 $, 3 cycles et 450 $ au plus | équivaut à parier sur 2 séances payées par acheteur (35 = 17,50 x 2) |
| CPA d'arrêt | plus de 35 $ après 14 jours et 300 $ dépensés, sans tendance à la baisse | voir section 10 |

CPA toléré en régime permanent = 17,50 $ x k, où k = nombre moyen de séances payées par acheteur sur 8 semaines, mesuré dans notre base (courriel de billet, aucune donnée envoyée aux plateformes). Tant que k n'est pas mesuré, k = 1. Exemple : k = 1,5 -> 26 $ ; k = 2 -> 35 $ ; k = 3 -> 52,50 $. La récurrence est un pari [H] : ne pas la compter avant 3 cycles de données.

### 4.3 Ce qu'il faut pour atteindre l'équilibre (formules)
- Coût par visite de page = CPM / (1000 x CTR du lien x taux de vues de la page).
- Conversion visite -> achat requise = coût par visite / CPA visé.

Conversion requise (visite -> achat), vues de page = 80 % des clics :
| CPM (CAD) | CTR lien | Coût par visite | Requis pour 17,50 $ | Requis pour 12 $ |
|---|---|---|---|---|
| 8 $ | 1,0 % | 1,00 $ | 5,7 % | 8,3 % |
| 12 $ | 1,0 % | 1,50 $ | 8,6 % | 12,5 % |
| 18 $ | 1,0 % | 2,25 $ | 12,9 % | 18,8 % |
| 12 $ | 1,5 % | 1,00 $ | 5,7 % | 8,3 % |
| 18 $ | 1,5 % | 1,50 $ | 8,6 % | 12,5 % |

Lecture : un trafic froid convertit rarement à 6-13 % pour un achat de 20 $ [H, aucune donnée propre]. Le chemin par le vote est plus plausible : CPA via le vote = coût par vote / taux vote -> achat. Coût par vote maximal pour être à l'équilibre : 1,75 $ si 10 % des votants achètent ; 2,63 $ à 15 % ; 4,38 $ à 25 % ; 6,13 $ à 35 % (doubler si k = 2).

Tous les CPM, CTR et taux ci-dessous sont des hypothèses [H]. Aucun benchmark vérifié pour l'éducation au Québec n'a été trouvé.

### 4.4 Scénarios de budget et résultats plausibles (fourchettes larges, volontairement)
| Scénario | Budget/sem. | Quand | Résultats par semaine (hypothèses H) |
|---|---|---|---|
| A. Démarrage prudent (retenu) | 150 $ : Meta 120 (vote ados 45, parents 55, retargeting 20) + Snap 30. Cycle 0 : le retargeting n'a pas encore de public, ses 20 $ vont aux parents (75) | 3 cycles (S42 à S44), perte maximale 450 $ | Votes 2 / 8 / 31 (pessimiste / central / optimiste) ; billets attribuables 0,4 / 3 / 17 ; coût par billet 375 $ / 47 $ / 9 $ |
| B. Croissance | 300 $ : Meta 260 (vote 80, parents 130, retargeting 50) + Snap 40 (+ Snap 10 de plus seulement si son CPA est meilleur) | Si le portillon 14 jours est vert ou jaune en amélioration (section 10) ; hausse maximale de 25 % par semaine | Mêmes taux, volume double ; rendements décroissants probables |
| C. Échelle | 600 $ et plus ; Advantage+ sales à 30 % du budget Meta (parents) ; optimisation Purchase | Seulement si CPA attribué de 17 $ ou moins pendant 3 cycles de suite, remboursements 8 % ou moins | Non estimé : aucune donnée |

Hypothèses du tableau A [H] : vote ados Meta CPM 5/8/12 $, CTR 1,8/1,2/0,7 %, vote par visite 20/12/6 % ; parents CPM 8/12/18 $, CTR 1,5/1,0/0,6 %, achat par visite 5/2,5/1 % ; retargeting CPM 12/18/25 $, achat par visite 15/8/3 % ; Snap : environ 1,24 $ par clic, 10 % de votes par visite ; vote -> achat 25/15/8 %. À remplacer par les données réelles dès le jour 7. Attention : le KPI interne « 2 400 $ à 5 400 $ de revenu par dimanche » (docs/academie) ne se tiendra pas avec la pub seule à ce budget : il dépend du volume organique et du bouche-à-oreille.

Contrôles de dépense : limite de dépenses du compte Meta à 400 $ (3 cycles Meta de 120 $ plus environ 10 % de marge) ; plafond de campagne Snap à 100 $ ; budgets à vie avec date de fin sur chaque ensemble Meta (aucun ensemble sans fin) ; budgets quotidiens de 5 $ avec dates de fin sur Snap. Un compte neuf serait plafonné vers 50 $/jour au départ [T : https://www.stackmatix.com/blog/meta-ads-minimum-daily-budget-2026] : nos pointes (environ 35 $/jour en fenêtre de vente) y tiennent.

---

## 5. Calendrier

### 5.1 Le cycle hebdomadaire (heure du Québec, fuseau du compte : America/Toronto)
| Quand | Ce qui se passe | Publicité (prudent) |
|---|---|---|
| Lundi 8 h -> mercredi 23 h 59 | Votes | Meta : ensemble ados vote (45 $). Snap : escouade vote (2 annonces, 5 $/jour). Destination : rpvdsuccess.com/vote |
| Jeudi 17 h | Sélection auto des 4 sujets, courriels « SÉLECTIONNÉ » / « pas ce dimanche » (alimentent le « retargeting » des votants, gratuit) | Rien de payant avant 17 h 30 |
| Jeudi 17 h 30 -> samedi 23 h 59 | Fenêtre de vente (55 h, 20 $, remboursement libre-service) | Meta : parents (55 $) + retargeting adultes (20 $). Snap : escouade « montre ça à ton parent » (5 $/jour). Destination : rpvdsuccess.com (page d'accueil avec les sessions) |
| Samedi 23 h 59 -> dimanche 8 h | Ventes fermées | Toutes les diffusions se terminent à 23 h 59 |
| Dimanche | 4 séances (13, 15, 17, 19 h). 8 h : places libérées par de vrais remboursements seulement | Aucune pub payante. Post organique « N places libérées » seulement si N > 0 (copié depuis l'admin) |
| Lundi 9 h | Courriel de suivi et nouveau vote ; bilan hebdomadaire (20 min) | Dupliquer les ensembles pour le cycle suivant |

Un vote jeudi-dimanche compte pour la semaine suivante : aucune annonce n'est nécessaire le jeudi pour le vote.
Les annonces ne nomment pas les sujets de la semaine (ils sont connus jeudi 17 h) : la page d'arrivée les affiche. Option, à partir du cycle 3 : annonce « sujets de la semaine » créée jeudi à 17 h 30 (examen Meta de quelques heures), si le test montre un gain.

### 5.2 Dates concrètes du premier cycle (cycle 0 = S42)
Conditions de départ : vérifications d'identité faites au plus tard mercredi 7 octobre ; annonces soumises à l'examen au plus tard vendredi 9 octobre en soirée (examen de 24 à 48 h, plus long pour les cibles ados [T]). Sinon, décaler tout le calendrier d'une semaine (cycle 0 = S43, lundi 19 octobre).
- Lundi 12 oct. 8 h -> mercredi 14 oct. 23 h 59 : vote (lundi 12 octobre est congé de l'Action de grâces : les élèves sont à la maison).
- Jeudi 15 oct. 17 h 30 -> samedi 17 oct. 23 h 59 : ventes. Dimanche 18 oct. : première séance publicitaire.
- Bilans : jeudi 15 oct. 16 h (J+3), lundi 19 oct. (J+7), lundi 26 oct. (J+14), lundi 2 nov. (J+21).
Avant la première dépense payante vers /reserver, l'achat test réel de 20 $ avec remboursement doit être fait et l'adresse postale en ligne.

### 5.3 Calendrier saisonnier (épreuves ministérielles ; dates à recouper sur quebec.ca)
Source : https://www.quebec.ca/education/prescolaire-primaire-et-secondaire/programmes-formations-evaluation/epreuves-ministerielles-evaluation-apprentissages/epreuves-ministerielles/horaire et https://www.narcity.com/fr/dates-importantes-calendrier-scolaire-20262027-quebec
| Période | Action |
|---|---|
| 12 oct. -> 1er nov. | Cycles 0 à 2 : apprentissage (prudent, 150 $/sem.) |
| Nov. -> 3 déc. | Poussée légère sur Sec 5 français (épreuve d'écriture le 3 déc.) si le portillon est vert |
| 21 déc. -> 3 janv. | Pause publicitaire (congé des fêtes). Contenu organique seulement |
| 4 -> 21 janv. | Poussée : Sec 4 histoire 15, science 20, maths 21 janvier (budget jusqu'à ×1,5 seulement si CPA dans la cible) |
| Fév. -> mars | Entretien ; pause pendant la relâche (1er-5 mars) |
| Avril -> mi-mai | Montée progressive ; Sec 5 français 6 mai |
| Mai -> mi-juin | Poussée maximale : maths Sec 4 les 11 et 18 juin, histoire 14, science 16 |
| Fin juin | Arrêt et bilan (fin des classes 21-23 juin) |

---

## 6. Structure Meta (Facebook + Instagram)

### 6.1 Compte et prérequis (Claude/équipe technique, sauf vérification et paiement)
- Compte publicitaire en CAD, fuseau America/Toronto (non modifiable après création [T]). Page Facebook « RPVD Success » + compte Instagram @rpvdsuccess liés.
- Domaine rpvdsuccess.com vérifié (enregistrement TXT chez Netlify) : recommandé, non obligatoire pour configurer les événements [T : https://www.jonloomer.com/meta-announces-big-changes-to-website-conversion-campaigns/].
- Un Pixel (jeu de données) ; mise en correspondance avancée automatique désactivée ; aucun événement envoyé sans consentement.
- Aucune catégorie publicitaire spéciale (l'éducation n'en est pas une [UI]).
- Attribution : 7 jours après clic + 1 jour après vue (les fenêtres 7 jours-vue et 28 jours-vue ont été retirées le 12 janvier 2026 [T : https://www.dataslayer.ai/blog/meta-ads-attribution-window-removed-january-2026]). Comparer avec 1 jour après clic. Stripe fait foi.
- Advantage+ creative : désactiver amélioration du texte générative, CTA amélioré, ajouts d'image ou de fond par IA, musique, superpositions de texte. Garder seulement le recadrage selon le placement (raison : une reformulation peut changer un prix ou créer une promesse de réussite).
- Désactiver les déclencheurs Boosend sur les commentaires des publicités tant que l'adresse postale et l'EFVP ne sont pas finalisées ; modérer à la main, réponses publiques courtes vers /vote.

### 6.2 Campagnes et ensembles (copiable dans Ads Manager)
Règle générale : budget au niveau de l'ensemble (budget à vie), aucun budget de campagne, dates de début et de fin saisies, aucun calendrier horaire (diffusion continue), plus bas coût (volume le plus élevé), aucun plafond d'enchère au départ.

**Campagne 1 : `RPVD_META_VOTE_QC-FR`** (Ventes ; si l'événement Lead n'est pas offert sous Ventes [UI], utiliser l'objectif Prospects avec lieu de conversion « site web »)
| Champ | Valeur |
|---|---|
| Ensemble | `S42_ADO_VOTE_LEAD_BV45` |
| Lieu de conversion / événement | Site web / Lead (vote) |
| Budget et dates | 45,00 $ à vie ; lundi 12 oct. 8 h 00 -> mercredi 14 oct. 23 h 59 (palier 1) |
| Lieu | Québec (province), personnes qui y vivent |
| Âge | 14 à 17 ans ; contrôle strict (si l'interface refuse 14, prendre 15-17) ; Advantage+ audience désactivé, audience d'origine |
| Ciblage détaillé, langues, audiences | Aucun. Aucune audience personnalisée ni similaire. Aucun retargeting |
| Placements | Manuels : Instagram (Fil, Stories, Reels, Explorer) + Facebook (Fil, Stories, Reels). Exclure Audience Network, Messenger |
| Annonces | `S42_ado-tu-votes_reel9x16_v1`, `S42_ado-demarche-demo_reel9x16_v1` (2 à 3 annonces au maximum) |
| Bouton | En savoir plus |
| URL | voir 6.4 |

**Campagne 2 : `RPVD_META_VENTE_QC-FR`** (Ventes)
| Champ | Valeur |
|---|---|
| Ensemble | `S42_PAR_PROSP_IC_BV75` au cycle 0 (retargeting pas encore disponible), puis `S43_PAR_PROSP_IC_BV55` |
| Événement | InitiateCheckout (palier 1) |
| Budget et dates | 55 $ à vie (75 $ au cycle 0) ; jeudi 17 h 30 -> samedi 23 h 59 |
| Lieu et âge | Québec (province) ; 35 à 55 ans ; langue : français si le champ existe [UI] |
| Ciblage détaillé | Aucun, ou « Parents (adolescents 13-17 ans) » si offert [UI] ; sinon audience large |
| Exclusions | Audience « Acheteurs 180 j » (dès qu'elle existe) |
| Placements | Advantage+ placements ; exclure Audience Network |
| Annonces cycle 0 | `S42_par-tout-est-ecrit_carrousel1x1_v1`, `S42_par-prix-compare_img4x5_v1`. Cycle 1 : ajouter `par-protection-eleve` (seulement si Zoom est configuré, voir 8) et `par-un-sujet-sans-abonnement` |
| Bouton | En savoir plus |

**Campagne 3 : `RPVD_META_RT_QC-FR`** (Ventes), dès le cycle 1
| Champ | Valeur |
|---|---|
| Ensemble | `S43_PAR_RT_IC_BV20` |
| Audience | Visiteurs avec ViewContent 14 j OU PageView 7 j (consentement), moins Acheteurs 180 j. Si l'audience affiche moins de 100 personnes [UI], ne pas lancer : verser les 20 $ aux parents |
| Âge | 25 à 60 ans seulement (adultes : ce plancher exclut aussi les adolescents qui auraient consenti au pixel) |
| Annonce | `S43_rt-inscriptions-ferment-samedi_img4x5_v1` ; bouton S'inscrire |
| Budget et dates | 20 $ à vie ; jeudi 17 h 30 -> samedi 23 h 59 |

Ensemble ados « montre ça à ton parent » sur Meta : prévu seulement au scénario B (10 $), pour ne pas fragmenter 120 $. En phase prudente, ce message passe par Snap.

### 6.3 Nommage
- Campagne : `RPVD_META_<VOTE|VENTE|RT>_QC-FR`
- Ensemble : `S<semaine ISO>_<ADO|PAR>_<PROSP|VOTE|RT>_<LEAD|IC|VC|PUR>_BV<budget à vie>` (ex. `S42_PAR_PROSP_IC_BV75`)
- Annonce : `S<semaine>_<id-angle>_<format>_v<n>` (ex. `S42_ado-tu-votes_reel9x16_v1`)
- Caractères autorisés : lettres, chiffres, `_` et `-` seulement, sans accent ni espace (les noms sont réutilisés dans les liens).

### 6.4 UTM et `src` (exacts)
Gabarit (aucune donnée personnelle dans l'URL) :
`https://rpvdsuccess.com/<vote|>?utm_source=meta&utm_medium=paid&utm_campaign=<rpvd_vote|rpvd_vente|rpvd_retargeting>&utm_content=<id-angle>&utm_term={{adset.name}}&src=<src>`

| Angle | Fenêtre | URL complète (Meta) |
|---|---|---|
| ado-tu-votes | Vote | `https://rpvdsuccess.com/vote?utm_source=meta&utm_medium=paid&utm_campaign=rpvd_vote&utm_content=ado-tu-votes&utm_term={{adset.name}}&src=pub-meta-ados` |
| ado-demarche-demo | Vote | `https://rpvdsuccess.com/vote?utm_source=meta&utm_medium=paid&utm_campaign=rpvd_vote&utm_content=ado-demarche-demo&utm_term={{adset.name}}&src=pub-meta-ados` |
| ado-montre-a-ton-parent | Vente (Snap ; Meta au scénario B) | `https://rpvdsuccess.com/?utm_source=meta&utm_medium=paid&utm_campaign=rpvd_vente&utm_content=ado-montre-a-ton-parent&utm_term={{adset.name}}&src=pub-meta-ados` |
| par-tout-est-ecrit | Vente | `https://rpvdsuccess.com/?utm_source=meta&utm_medium=paid&utm_campaign=rpvd_vente&utm_content=par-tout-est-ecrit&utm_term={{adset.name}}&src=pub-meta-parents` |
| par-prix-compare | Vente | idem avec `utm_content=par-prix-compare` |
| par-protection-eleve | Vente | idem avec `utm_content=par-protection-eleve` |
| par-un-sujet-sans-abonnement | Vente | idem avec `utm_content=par-un-sujet-sans-abonnement` |
| rt-inscriptions-ferment-samedi | Retargeting | `https://rpvdsuccess.com/?utm_source=meta&utm_medium=paid&utm_campaign=rpvd_retargeting&utm_content=rt-inscriptions-ferment-samedi&utm_term={{adset.name}}&src=pub-meta-rt` |

`{{adset.name}}` est la macro dynamique de Meta : elle injecte automatiquement la semaine et l'audience (ex. `S42_PAR_PROSP_IC_BV75`). `fbclid` est ajouté par Meta ; on ne l'enregistre pas sans consentement.
Valeurs de `src` : `pub-meta-ados`, `pub-meta-parents`, `pub-meta-rt`, `pub-snap-ados`, `partage-parent` (bouton du site). Les valeurs organiques existantes (`insta`, `tiktok`, docs/academie/03-POSTS-SOCIAUX.md) ne changent pas ; `pub` seul n'est plus utilisé.
Dépendance technique : le site doit conserver `src` et `utm_*` depuis l'arrivée jusqu'au vote et au billet (colonne ou métadonnée Stripe) pour calculer « votes par source » et « billets par source » dans l'admin. À vérifier dans le code [A].

---

## 7. Structure Snapchat

Contexte : Snap sert à rejoindre des 15-17 ans ; les parents y sont peu présents (Meta s'en charge). Plusieurs options de ciblage disparaissent pour les 13-17 ans en Europe et au Royaume-Uni [V : https://developers.snap.com/api/marketing-api/Ads-API/announcements] ; pour le Canada, la liste exacte n'a pas été trouvée : [UI] (options grisées = indisponibles).

### 7.1 Prérequis
Profil Snapchat public et compte d'annonceur vérifié (humain). Pixel Snap chargé seulement après consentement ; mise en correspondance avancée désactivée. Soumettre les annonces 24-48 h avant le premier jour (délai officiel non trouvé).

### 7.2 Campagne 1 (phase S1, démarrage) : `RPVD_SNAP_TRAFIC_ADOS_QC-FR`
| Champ | Valeur |
|---|---|
| Objectif | Trafic (site web). Optimisation : visites de la page de destination si offerte, sinon clics |
| Plafond de campagne | 100 $ (3 cycles) |
| Escouade A | `S42_ADO_VOTE_LPV_D5` : lundi 8 h 00 -> mercredi 23 h 59 ; budget quotidien 5 $ ; annonces `ado-tu-votes` et `ado-demarche-demo` ; destination /vote |
| Escouade B | `S42_ADO_PARTAGE_LPV_D5` : jeudi 17 h 30 -> samedi 23 h 59 ; 5 $ par jour ; annonces `ado-montre-a-ton-parent` et `ado-demarche-demo` ; destination page d'accueil |
| Ciblage (A et B) | Québec ; langue français ; âge 15 à 17 ans (14 à 17 ans seulement si l'interface choisit l'âge à l'année ; si elle n'offre que la tranche 13-17, ne pas lancer sur Snap : règle ferme) ; aucun intérêt, aucune audience personnalisée, aucune audience similaire |
| Placements | Automatiques (Top Snap : [UI]) ; exclure Sponsored Snaps (clavardage) |
| Enchère | Enchère automatique (plus bas coût) |
| Format | Snap Ad plein écran 9:16, 1080 x 1920, MP4 H.264, 6-10 s, texte à l'écran ; zones libres 150 px en haut et 330 px en bas [T : https://strikesocial.com/blog/snapchat-ad-specs/] |
| Bouton | En savoir plus (équivalent de MORE ; libellé français exact : [UI]) ; jamais « Acheter » |
| Nom de la marque | RPVD Success (25 caractères au maximum) ; titre de 34 caractères au maximum |

UTM Snap : `https://rpvdsuccess.com/<vote|>?utm_source=snap&utm_medium=paid&utm_campaign=<rpvd_vote|rpvd_vente>&utm_content=<id-angle>&utm_term=ados_s42&src=pub-snap-ados` (le `utm_term` de la semaine est modifié à la duplication). Exemple : `https://rpvdsuccess.com/vote?utm_source=snap&utm_medium=paid&utm_campaign=rpvd_vote&utm_content=ado-tu-votes&utm_term=ados_s42&src=pub-snap-ados`.

### 7.3 Campagne 2 (phase S2, conditionnelle) : `RPVD_SNAP_VENTES_PARENTS_QC-FR`
Activer seulement après 10 achats attribuables à Snap ou plus en 14 jours [T : research/snapchat.md]. Objectif Ventes, événement PURCHASE (pixel sur /merci avec `transaction_id`), attribution 7 jours clic / 0 vue, parents 30-54 ans, Québec, français, escouade séparée de tout public ado. Enchère automatique ; coût cible de 12 $ seulement après les 10 premiers achats. Jamais de retargeting, de liste de clients ni d'audience similaire pour les moins de 18 ans.
Pourquoi pas Ventes dès le premier jour : l'optimisation sur achat n'apprendra pas avec 30 $/semaine ; Trafic donne un coût par visite exploitable.

---

## 8. Les 8 angles créatifs

Tous : français, prix total visible (20 $ CAD tout inclus), mention « RPVD Success, Sherbrooke » dans la page ou le texte, sous-titres incrustés, aucun compteur, aucune promesse de note, aucun « expert » ni « meilleur », aucune personne ou chiffre inventés. Les insights sont des hypothèses [H] à tester, pas des preuves. Tutoiement pour les ados, vouvoiement pour les parents.

### Parents (Meta, fil ; vouvoiement)

**1. `par-tout-est-ecrit`**
- Accroche : « 20 $ tout inclus. Remboursement complet jusqu'au samedi 23 h 59. »
- Insight [H] : le parent veut du contrôle et un risque minimal avant de payer.
- Preuve réelle : /reserver affiche le prix total, la politique et l'identité du commerçant ; remboursement libre-service par le lien du courriel de billet ; /legal/refunds. (L'adresse postale doit être en ligne avant la diffusion.)
- Texte principal : « Bootcamp RPVD : 1 h 30 en direct sur Zoom, le dimanche. 20 $ tout inclus. Remboursement complet jusqu'au samedi 23 h 59. » Suite : « Sec 1 à 5 (maths, sciences, français). Le sujet est choisi par vote ; vous le voyez avant de payer. Maximum de 90 places par salle. RPVD Success, Sherbrooke. »
- Titre : « 20 $ tout inclus. Remboursable. » ; bouton : En savoir plus.
- Formats : carrousel 1:1 en 4 cartes (le sujet est voté ; réservation du jeudi au samedi 23 h 59 ; séance de 1 h 30 en direct le dimanche ; remboursement complet jusqu'à samedi 23 h 59) ; image 4:5.

**2. `par-prix-compare`**
- Accroche : « 1 h 30 en groupe : 20 $. Tutorat privé en ligne, en individuel : environ 45 $ l'heure. »
- Insight [H] : le parent compare les prix avant d'acheter.
- Preuve réelle : tarif public de tutorat en ligne de 45 $/h (https://tutorax.com/en-ca/qc/tutoring-services/, consulté le 2026-10-05) ; 46 à 50 $/h chez un autre fournisseur (https://www.successcolaire.ca/en). Calcul : 45 x 1,5 = 67,50 $ ; 20 / 1,5 = 13,33 $ l'heure. À revérifier avant chaque diffusion ; ne pas nommer l'entreprise dans l'annonce.
- Texte principal : « 1 h 30 en groupe : 20 $. Tutorat privé en ligne en individuel : environ 45 $ l'heure (tarifs publics, oct. 2026). » Suite : « Ce n'est pas la même chose : ici, jusqu'à 90 élèves, sans suivi individuel. C'est une façon accessible de travailler un sujet précis. »
- Titre : « 20 $ pour 1 h 30 en direct » ; bouton : En savoir plus.
- Formats : image 4:5 comparative (deux barres, mentions « groupe » et « individuel » lisibles, pas de logo de concurrent) ; petite mention de la source dans l'image.

**3. `par-protection-eleve`** (diffuser seulement une fois Zoom configuré et les réglages de docs/legal/02-ZOOM-PROTECTION-ELEVES.md appliqués et vérifiés)
- Accroche : « Votre ado en ligne, avec des règles claires. »
- Insight [H] : le parent craint un Zoom avec des inconnus.
- Preuve réelle : réunions créées avec inscription obligatoire, lien personnel (un appareil à la fois), caméras des élèves coupées, micros coupés à l'entrée, mode focus (les élèves ne voient que l'animateur), aucun enregistrement ; collecte minimale (courriel seulement, ni nom complet ni âge) : docs/legal/02-ZOOM-PROTECTION-ELEVES.md et page de confidentialité.
- Texte principal : « Séance Zoom du Bootcamp RPVD : caméras des élèves coupées, micros coupés à l'entrée, aucun enregistrement. Nous ne demandons ni nom complet ni âge. » Suite : « Lien personnel envoyé 60 minutes avant. Les règles sont écrites avant le paiement. »
- Titre : « Ce qui protège votre ado sur Zoom » ; bouton : En savoir plus.
- Formats : image 4:5 (liste de 4 protections) ; vidéo 4:5 de 6-10 s.

**4. `par-un-sujet-sans-abonnement`**
- Accroche : « Un sujet. 1 h 30. Aucun abonnement. »
- Insight [H] : le parent veut une durée définie et aucun engagement.
- Preuve réelle : chaque séance est un achat unique de 20 $ par Stripe Checkout ; sujet et heure visibles avant de payer ; durée 1 h 30.
- Texte principal : « Une séance, un sujet choisi par vote, 1 h 30 en direct sur Zoom. 20 $ tout inclus, sans abonnement. » Suite : « Vous voyez le sujet et l'heure avant de payer. Remboursable jusqu'au samedi 23 h 59. »
- Titre : « Sans abonnement. 20 $ la séance. » ; bouton : En savoir plus (tester S'inscrire au cycle 3).
- Formats : image 4:5 ; Reel/vidéo 4:5.

### Ados 14-17 (Meta Reels/Stories et Snap ; tutoiement ; jamais d'appel d'achat direct)

**5. `ado-tu-votes`** (fenêtre de vote)
- Accroche : « Le sujet de dimanche, c'est toi qui le choisis. »
- Insight [H] : les ados rejettent un programme imposé ; le choix donne de l'autonomie.
- Preuve réelle : /vote ; les 4 sujets les plus votés sont choisis jeudi à 17 h (automatique) ; 4 plages le dimanche (13, 15, 17, 19 h). Voter est gratuit (courriel demandé, indiqué sur la page).
- Vidéo 6-8 s (9:16, sans son, boucle) : 0-2 s « Sujet de dimanche ? » ; 2-5 s « Maths · Chimie · Physique · Français » ; 5-8 s « Tu votes. Jeudi 17 h, les 4 plus votés sont choisis. rpvdsuccess.com/vote ».
- Texte principal : « Vote le sujet du Bootcamp RPVD (Sec 1 à 5). Voter est gratuit. Jeudi 17 h, les 4 plus votés sont choisis : 1 h 30 en direct sur Zoom dimanche. »
- Titre : « Vote ton sujet de dimanche » ; bouton : En savoir plus.
- Formats : MP4 9:16 en boucle, 5 à 8 s, 4 Mo ou moins (équivalent honnête d'un « GIF cliquable » : la clicabilité vient du bouton de l'annonce, pas du fichier) ; story statique 9:16 ; variante 4:5.

**6. `ado-demarche-demo`** (vote ; aussi en vente)
- Accroche : « Résumer les principes. Vulgariser la démarche. »
- Insight [H] : apprendre par cœur ne suffit pas face à un exercice-piège ; une démarche claire rassure.
- Preuve réelle : la démarche RPVD appliquée à un vrai exercice, montrée à l'écran (exercice résolu par l'équipe : ne pas le présenter comme celui d'un élève). Séance de 1 h 30 en direct (docs/academie/05-RUN-SHEET-SESSION.md).
- Vidéo 12-15 s : 0-2 s l'exercice-piège « Un exercice. Une démarche en 3 étapes. » ; 2-10 s « 1. Résume le principe. 2. Explique-le simplement. 3. Applique-le. » ; 10-14 s « Dimanche, 1 h 30 en direct sur ton sujet voté. rpvdsuccess.com/vote ».
- Texte principal : « La démarche RPVD sur un vrai exercice, en 15 secondes. Dimanche, on la travaille en direct sur un sujet voté par les élèves (Sec 1 à 5). »
- Titre : « La démarche RPVD en 15 s » ; bouton : En savoir plus.
- Formats : MP4 9:16, un exercice par matière (maths, chimie/physique, français) pour tester la matière.

**7. `ado-montre-a-ton-parent`** (fenêtre de vente ; Snap en phase prudente)
- Accroche : « Dimanche, 1 h 30 en direct. Montre ça à ton parent. »
- Insight [H] : le parent paie ; l'ado doit pouvoir transmettre l'offre facilement et en confiance.
- Preuve réelle : 20 $ tout inclus, remboursement jusqu'à samedi 23 h 59, ventes fermées samedi 23 h 59 ; bouton « Envoyer à un parent » (dépendance technique, voir section 2).
- Texte principal : « Bootcamp RPVD : 1 h 30 en direct sur Zoom dimanche. 20 $ tout inclus, remboursable jusqu'à samedi 23 h 59. C'est à ton parent de décider : envoie-lui le lien. »
- Titre : « Envoie ça à ton parent » ; bouton : En savoir plus.
- Formats : MP4 9:16 de 6-8 s ; story statique.

### Retargeting adultes (Meta, 25-60 ans)

**8. `rt-inscriptions-ferment-samedi`**
- Accroche : « Les inscriptions pour dimanche ferment samedi à 23 h 59. »
- Insight [H] : le parent qui a regardé sans décider est aidé par une échéance réelle.
- Preuve réelle : les ventes ferment vraiment samedi 23 h 59 (tâche planifiée) ; plafond réel de 90 places par salle ; remboursement possible jusqu'à la fermeture.
- Texte principal : « Bootcamp RPVD de dimanche : inscriptions jusqu'à samedi 23 h 59, maximum de 90 places par salle. 20 $ tout inclus, remboursement complet jusqu'à la fermeture. »
- Titre : « Inscriptions jusqu'à samedi 23 h 59 » ; bouton : S'inscrire.
- Formats : image 4:5 ; MP4 4:5 de 6 s. Aucun compte à rebours animé ; aucun « plus que N places » dans une annonce (le chiffre ne peut pas être mis à jour à la minute : permis seulement dans un post organique publié le jour même avec le texte de l'admin).
- Formulation volontairement sans « vous avez visité » (éviter d'insinuer une surveillance : politique Meta sur les attributs personnels [A]).

### Garde-fous communs
- Fichiers prêts avant diffusion : 2 masters (9:16 1080 x 1920 ; 4:5 1080 x 1350), MP4 H.264 30 i/s, texte et visages dans la zone centrale (zones de sécurité Reels : haut environ 14 %, bas environ 35 %, côtés environ 6 % [T : https://adsuploader.com/blog/meta-ads-safe-zones]) ; vérifier dans l'aperçu Ads Manager.
- Visuels sobres, adolescents plausiblement de 15 à 17 ans, aucune mascotte ni esthétique de jeu pour enfants (critère de la manière, LPC art. 249). Aucune personne identifiable sans autorisation écrite (parent si mineur).
- Marque « RPVD Success » accompagnée d'un descripteur français (« atelier en direct de 1 h 30 sur Zoom »).
- Témoignages : aucun avant les premières séances ; ensuite seulement avec consentement écrit du parent, sans « avant/après » de notes.
- Textes organiques existants à NE PAS réutiliser en pub (docs/academie/03-POSTS-SOCIAUX.md) : « Tu rates tes examens de maths... » (insinue que la personne échoue) et « tu ne te trompes plus jamais » (promesse absolue). À corriger aussi dans les posts organiques.

---

## 9. Plan de test créatif

Règle : une seule variable par cycle, ensembles dupliqués à l'identique, aucune modification en cours de fenêtre. À ces budgets, seules les différences nettes se voient.

| Cycle | Test | Variantes | Critère de décision |
|---|---|---|---|
| 0-1 | T1 : angle ados (vote) | `ado-tu-votes` contre `ado-demarche-demo` (même ensemble, même format) | Taux d'accroche (lectures de 3 s / impressions) 25 % ou plus [T : https://www.kickbite.io/en/blog/hook-rate] ; puis CTR du lien et coût par visite. Gagnant si au moins 30 % meilleur sur le coût par clic ET au moins 1 000 impressions et 20 clics chacun. Coût par vote : conclusion seulement à 10 votes ou plus par annonce |
| 0-1 | T2 : angle parents | `par-tout-est-ecrit` contre `par-prix-compare` | Même logique (CTR, coût par visite, taux d'InitiateCheckout) ; le biais de répartition de Meta (une annonce peut être favorisée) impose de lire les rapports « par annonce » avec prudence |
| 2-3 | T3 : angles parents suivants | `par-protection-eleve` contre `par-un-sujet-sans-abonnement` | Idem ; garder la meilleure des 4 |
| 3-4 | T4 : format | Carrousel/image contre vidéo 4:5 (parents) ; Reel 9:16 contre story statique (ados) | Taux d'accroche, tenue (ThruPlay / lectures de 3 s), coût par visite |
| 4+ | T5 : bouton | En savoir plus contre S'inscrire | Taux d'InitiateCheckout par clic |
| 5+ | T6 : matière | Exercice de maths contre chimie/physique contre français (ados) | Coût par vote par matière |

Rythme : chaque lundi, garder les 1 ou 2 annonces gagnantes et remplacer la plus faible. Couper une annonce seulement après 3 jours de diffusion, 1 500 impressions ou plus, et à la fois taux d'accroche inférieur à 20 % et CTR inférieur à 0,6 %. Les repères 25 %/30 %/20 % sont des repères tiers, pas nos résultats. Colonnes à ajouter dans Ads Manager : lectures de 3 s, ThruPlay, CTR (lien), CPC (lien), vues de la page de destination, coût par résultat.

---

## 10. Règles de décision (J = lancement du cycle 0)

| Moment | On regarde | Décisions |
|---|---|---|
| J+3 (jeudi 15 oct. 16 h, fin de la 1re fenêtre de vote) | Technique et livraison seulement : annonces approuvées, impressions livrées, CPM inférieur à 2 fois l'hypothèse, CTR du lien de 0,5 % ou plus, événements reçus dans Events Manager (PageView, Lead) et dans Stripe/admin (votes avec `src`) | Refus d'annonce : corriger et resoumettre. Dépense supérieure à 150 % du plan : suspendre. Aucune conclusion sur le CPA |
| J+7 (lundi 19 oct., cycle 0 terminé) | Indicateurs avancés : taux d'accroche, CTR, coût par visite, coût par vote, ViewContent, InitiateCheckout, billets Stripe par `src`, remboursements | Couper/garder les annonces (règle de la section 9). Si moins de 10 IC vus sur 14 jours pour l'ensemble parents : passer au palier 0 au cycle 2. Créer l'audience de retargeting si elle atteint 100 personnes |
| J+14 (lundi 26 oct., cycle 1 terminé) : premier portillon économique | Coût par place attribué (dépense / billets nets avec `src=pub-*`) ; coût par vote ; vote -> achat ; remboursement ; mesure aussi « mélangé » (dépense totale / tous les billets de la semaine) | **Vert** : CPA attribué de 17 $ ou moins -> hausse de 25 % par semaine au plus (scénario B). **Jaune** : 17 à 35 $ -> maintenir 150 $ pendant le cycle 2, itérer créatifs et page d'accueil. **Rouge** : plus de 35 $ ou aucun billet attribué après 300 $ dépensés -> suspendre la pub payante (Meta et Snap), conserver l'organique et le courriel, réviser l'offre et la page |
| J+21 (lundi 2 nov., cycle 2 terminé) : deuxième portillon | Mêmes mesures + première lecture du taux de réachat (k) | Vert ou jaune en baisse d'au moins 15 % semaine sur semaine, et remboursements de 10 % ou moins : scénario B. Sinon : arrêt de la pub payante (perte plafonnée à 450 $). Aucune troisième chance sans changement d'offre ou de page |
| Continu | Seuils de montée en charge | Hausse seulement quand 2 cycles de suite sont dans la cible ; jamais plus de 25 % par semaine ; passage à Purchase à 40 ventes attribuées par semaine (2 semaines de suite) ; Advantage+ sales à 50 ventes par semaine stables 3-4 semaines |
| Continu | Seuils d'arrêt d'urgence | Taux de remboursement supérieur à 15 % sur un cycle ; plainte d'un parent ou d'un élève liée à une annonce ; refus répétés pour mineurs ; erreur de prix ou de date dans une annonce -> pause immédiate et correction |

Lecture prudente des chiffres : à 150 $/semaine, deux cycles représentent 300 $ et probablement 6 à 7 billets au scénario central. L'échantillon est minuscule : les portillons combinent donc le CPA, les indicateurs avancés et la tendance, et ne reposent jamais sur une seule semaine. Un CPA « mélangé » bon avec un CPA attribué mauvais signifie que la croissance vient de l'organique, pas de la pub.

---

## 11. KPI et tableau de bord hebdomadaire (lundi, 20 minutes)

| KPI | Source | Cible de départ [H] |
|---|---|---|
| Taux d'accroche (lectures 3 s / impressions) | Meta | 25 % ou plus |
| CTR du lien | Meta / Snap | 0,8 % ou plus (ados 1,2 %) |
| Vues de la page / clics | Meta + site | 70 % ou plus |
| Coût par vote (par `src`) | Dépense / votes | 6 $ ou moins (toléré : 10 $) |
| Vote -> achat (cohorte, par courriel, dans notre base) | Base de données interne | 15 % ou plus |
| Coût par place attribué | Dépense / billets nets avec `src=pub-*` | 17 $ (équilibre) ; 12 $ (cible) ; 35 $ (plafond d'apprentissage) |
| Coût par place « mélangé » | Dépense totale / billets de la semaine | suivi de contexte |
| Taux de remboursement | Admin | moins de 10 % (arrêt à 15 %) |
| Part des billets `partage-parent` | Admin | à mesurer |
| k (séances payées par acheteur sur 8 semaines) | Base interne | à mesurer dès le cycle 3 |
| Santé technique | Events Manager | aucun doublon ni erreur ; EMQ 4 ou plus sur 10 ; 0 refus d'annonce non traité |

Qualité mesurable (honnête) : le « score d'opportunités » de Meta ne mesure pas la performance (Meta le précise [T : https://www.jonloomer.com/opportunity-score/]). On applique seulement les recommandations utiles (formats 9:16, placements, correction d'erreurs de pixel) et on refuse celles qui gonflent le budget sans lien avec les ventes. Viser : classements de qualité et d'engagement « moyen » ou mieux, page rapide sur mobile, promesse exacte, aucun refus non traité.

Rituel : lundi 9 h bilan ; dimanche soir ou lundi : dupliquer les ensembles du cycle suivant (nom, dates, budget à vie ; rien d'autre) ; mardi : soumettre les annonces de vente du jeudi (le contenu ne dépend pas des sujets) ; jeudi 17 h 30 : vérifier que la page d'accueil affiche bien les 4 nouveaux sujets avant l'ouverture de la diffusion ; samedi 23 h 59 : vérifier que tout est terminé.

---

## 12. Conformité : portillons avant la première dépense

Bloquants (d'après research/droit-qc.md et le dépôt) :
1. `postalAddress` vide dans `src/legal/business.json` : exigée pour le contrat à distance (LPC) et la LCAP. Information que seul l'humain peut fournir (une adresse civique ou une case postale) ; aucune pub vers /reserver ni DM tant qu'elle n'est pas en ligne.
2. EFVP (docs/legal/03-EFVP-FOURNISSEURS.md) non signée ; Boosend, Meta et Snap à ajouter ; politique de confidentialité à mettre à jour (publicité, source de provenance, Boosend, durée de conservation).
3. Bandeau de consentement avec case « publicité » séparée et chargement conditionnel des pixels livré et testé.
4. Âge minimal : Meta 14 ans (15 si l'interface refuse 14) ; Snap 15 ans (voir 7.2). Jamais la tranche « 13-17 ». Publicité destinée aux moins de 13 ans interdite (LPC art. 248-249 [V : https://www.opc.gouv.qc.ca/en/commercant/pratique-commerce/publicite-loi/publicite-enfant/]).
5. Contrôle des textes et visuels contre research/droit-qc.md §2.1-2.2 ; publicité en français (Charte, art. 52) ; prix total visible ; aucun compteur ni témoignage inventé.
6. Zoom : lien Zoom manuel acceptable en attendant, mais l'angle `par-protection-eleve` reste bloqué tant que Zoom (Server-to-Server) et les réglages du compte ne sont pas faits et vérifiés.
7. Les points [A] (qualification d'un DM déclenché par un commentaire, numéros d'articles, restrictions Snap au Canada, restrictions Meta 2026 sur les ados) : validation par un avocat avant toute hausse au-delà du scénario A.

Vérifications à l'écran le jour J : âge minimal réel, disponibilité de l'événement Lead sous Ventes, budget à vie avec dates, plafond du compte, taille minimale de l'audience de retargeting, options de ciblage des 13-17 ans au Canada sur Snap, zones de sécurité dans l'aperçu.

---

## 13. Ce que l'humain fait (dans cet ordre) et montants à saisir

| # | Quand | Action humaine | Montant / valeur |
|---|---|---|---|
| 1 | Cette semaine, dès que possible | Donner l'adresse postale (civique ou case postale) à Claude pour la mettre en ligne (information, pas une vérification) | aucun |
| 2 | Lundi 5 -> mercredi 7 oct. | Meta : créer ou valider le compte publicitaire (devise CAD, fuseau America/Toronto) ; **vérification d'identité** de l'administrateur de la Page et du compte (pièce d'identité, au besoin selfie) ; vérification d'entreprise facultative mais recommandée (limites plus hautes, récupération de compte) | aucun |
| 3 | Idem | Meta : ajouter le moyen de paiement ; entrer la limite de dépenses du compte | **400 $ CAD** (3 cycles) ; utiliser de préférence une carte avec une limite de crédit proche du budget (garde-fou) |
| 4 | Idem | Snapchat : profil public, compte d'annonceur, **vérification d'identité**, moyen de paiement | plafond de campagne **100 $ CAD** ; budgets quotidiens de **5 $ CAD** |
| 5 | Jeudi 8 -> vendredi 9 oct. | Aucune action : Claude crée les campagnes en brouillon d'après les sections 6 et 7, charge les créatifs et soumet à l'examen | aucun |
| 6 | Vendredi 9 oct. | Confirmation finale : un clic pour activer les annonces (action publique, donc validée par l'humain) | budgets de la section 4.4 : Meta 45 $ vote + 75 $ ventes (cycle 0), Snap 30 $ |
| 7 | Chaque lundi après le bilan | Au portillon vert/jaune seulement : relever la limite de dépenses Meta du montant du cycle suivant | +120 $ (scénario A) ou +260 $ (scénario B) |

Le reste (créatifs, textes, structure, nommage, UTM, pixels, événements, bilans, duplication) est livré prêt à l'emploi dans ce document et traité par Claude et l'équipe technique. Dépendances techniques à livrer avant le 12 oct. : bandeau « publicité », Pixel Meta/Snap conditionnels, événements de la section 3.2, conservation de `src`/`utm_*`, bouton « Envoyer à un parent », adresse postale, achat test réel avec remboursement.

---

## 14. Incertitudes (ce que ce plan ne sait pas)

- Aucun CPM, CTR ni taux de conversion n'est vérifié pour ce marché ; tout est [H]. Les fourchettes de la section 4.4 reflètent cette ignorance.
- Les sources Meta et Snap sont presque toutes des blogues ou des agences : la documentation officielle n'a pas pu être lue. Plafond initial de 50 $/jour, taille minimale d'audience, libellés français des boutons, options de ciblage des 13-17 ans au Canada sur Snap, poids d'un GIF : à confirmer à l'écran.
- Une source tierce (auditsocials.com) affirme que Meta retire en 2026 aussi le retargeting des moins de 18 ans ; une autre contredit le ciblage par genre. Le plan est conçu pour fonctionner dans le cas le plus restrictif.
- Sans consentement, le Pixel voit une partie seulement du trafic réel : le CPA vu dans Meta sera pessimiste ou incomplet ; Stripe et notre base décident.
- Les frais Stripe sur remboursement, l'assujettissement aux taxes et le coût réel des forfaits Netlify/Supabase restent à confirmer.
- Le statut juridique des DM déclenchés par un commentaire, la qualification du « retargeting par courriel de votants » et la lecture de la LPC art. 248 pour des visuels « destinés aux enfants » sont des points [A] pour un avocat.
- Les angles reposent sur des insights non prouvés ; seul le test les valide. Les calendriers scolaires varient selon le centre de services ; les dates d'épreuves sont à recouper sur quebec.ca.
- Le temps des fondateurs (préparation et 4 séances par dimanche) n'est pas dans l'économie unitaire.

---

## 15. Sources
- research/meta-ventes.md, meta-creatifs.md, snapchat.md, droit-qc.md, marche.md (campagne/01-recherche/).
- Dépôt : PROJECT_HANDOFF.md §-2, docs/academie/01, 03, 04, docs/legal/01 à 03, src/legal/business.json.
- Stripe Canada : https://www.venn.ca/resources/how-to-save-on-your-stripe-payments-for-canadian-businesses ; https://stripe.com/en-ca/pricing (non relu).
- Resend : https://resend.com/pricing.md. Zoom : https://www.eesel.ai/en/blog/zoom-pricing.
- Meta : https://searchengineland.com/meta-introduces-new-ad-targeting-limits-for-teens-391259 ; https://novoads.ai/en/blog/how-to-target-audiences-in-meta-ads ; https://www.auditsocials.com/blog/meta-teen-ad-targeting-restrictions-parental-controls-2026-age-gated-campaigns ; https://influee.co/blog/meta-campaign-objectives ; https://www.cometly.com/post/how-to-improve-facebook-ads-learning-phase ; https://madgicx.com/blog/meta-campaign-scheduling ; https://www.dataslayer.ai/blog/meta-ads-attribution-window-removed-january-2026 ; https://www.jonloomer.com/opportunity-score/ ; https://transparency.meta.com/policies/ad-standards/deceptive-content/unrealistic-outcomes.
- Snap : https://developers.snap.com/api/marketing-api/Ads-API/announcements ; https://www.snap.com/ad-policies ; https://developers.snap.com/marketing-api/Conversions-API/Deduplication ; https://admanage.ai/blog/snapchat-ads-manager-guide ; https://strikesocial.com/blog/snapchat-ad-specs/.
- Droit : https://www.opc.gouv.qc.ca/en/commercant/pratique-commerce/publicite-loi/publicite-enfant/ ; https://laws-lois.justice.gc.ca/eng/acts/c-34/section-74.01.html ; https://www.cai.gouv.qc.ca/uploads/Actualit%C3%A9s/2024-01-04_DOC-2.pdf ; https://crtc.gc.ca/eng/com500/guide.htm.
- Marché : https://tutorax.com/en-ca/qc/tutoring-services/ ; https://www.successcolaire.ca/en ; https://www.quebec.ca/education/prescolaire-primaire-et-secondaire/programmes-formations-evaluation/epreuves-ministerielles-evaluation-apprentissages/epreuves-ministerielles/horaire.
