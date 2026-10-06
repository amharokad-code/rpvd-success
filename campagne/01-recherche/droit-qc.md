# Conformité d'une campagne en ligne (ados 14-17 ans et parents, Québec) — Bootcamp RPVD

Rédigé le 2026-10-05. Repères de conformité, pas un avis juridique. Le dépôt contient déjà la même réserve (`docs/legal/01-CONFORMITE.md`) : faire valider la partie « publicité aux jeunes » par un avocat avant de dépenser au-delà de l'essai initial.

Légende : [V] = vérifié sur la source citée ; [A] = à valider (source primaire non consultée aujourd'hui, ou réglage de plateforme à contrôler à l'écran).

## 0. Bloquants avant toute diffusion

1. **Adresse postale vide** : `src/legal/business.json` -> `postalAddress: ""`. Elle est exigée dans tout message commercial (LCAP) et pour les contrats à distance (LPC). Tant qu'elle est vide, ne pas activer les DM automatiques de Boosend ni les courriels d'annonce. (Action humaine : adresse civique ou case postale.)
2. **EFVP à signer**, avec **Boosend, Meta et Snap ajoutés** à `docs/legal/03-EFVP-FOURNISSEURS.md` (transfert hors Québec, art. 17 Loi 25). Boosend n'y figure pas.
3. **Politique de confidentialité** à mettre à jour : publicité Meta/Snap, Boosend (identifiant Instagram, texte du commentaire, messages), durée de conservation. [A : relire `/legal/privacy`]
4. **Aucune pub aux moins de 14 ans** : ciblage minimum 14 ans (voir 1.1 pour le piège « 13-17 »).

## 1. Cadre juridique

### 1.1 Loi sur la protection du consommateur (LPC, RLRQ c. P-40.1)
- **Art. 248** : interdit la publicité à but commercial destinée à des personnes de moins de 13 ans. **Art. 249** : trois critères pour juger si une pub vise les moins de 13 ans : la nature et la destination du bien annoncé, la manière de présenter la pub, le moment et le lieu de diffusion. [V : OPC https://www.opc.gouv.qc.ca/en/commercant/pratique-commerce/publicite-loi/publicite-enfant/ ; guide d'application https://cdn.opc.gouv.qc.ca/media/documents/consommateur/bien-service/index-sujet/guide-application.pdf (mis à jour en 2012 pour Internet et les téléphones intelligents)]. Texte intégral de la loi non récupérable aujourd'hui (Légis Québec a bloqué la requête) : [A] confirmer sur https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-40.1.
- **Conséquence pratique** : le produit (aide aux études secondaires) n'est pas destiné aux moins de 13 ans, mais la manière (ton, visuels, personnages animés, jeux) et le ciblage peuvent attirer des 12 ans. Les plateformes ouvrent à 13+ : un public « 13-17 » contient des 13 ans. Fixer l'âge minimum à 14 ans partout. Si l'interface n'offre que des tranches incluant 13 ans, utiliser 15-17 (ados) et 25+ (parents). [A : vérifier les bornes exactes dans Meta Ads Manager et Snap Ads Manager le jour J.]
- **Prix et pratiques interdites** : prix total tout compris, sans frais ajoutés au paiement. 20,00 $ tout inclus est conforme tant que Stripe n'ajoute aucun frais visible au client. [A : numéros d'articles (219 et suiv., 224) à confirmer.]
- **Contrat à distance** (art. 54.1 et suiv.) : avant le paiement, afficher description, prix total, date, durée, identité et adresse du commerçant, politique de remboursement ; envoyer une copie du contrat. Déjà en place sur `/reserver` d'après `01-CONFORMITE.md`, sauf l'adresse (bloquant 1). [A : numéros d'articles.]
- **Mineurs contractants** : un mineur de 14 ans et plus peut contracter pour ses besoins ordinaires ; le contrat d'un mineur reste annulable pour lésion (Code civil). Le remboursement libre-service jusqu'à samedi 23 h 59 limite le risque. Prudence : présenter l'achat comme « avec l'accord d'un parent » dans les pubs ados. [A : Code civil art. 156 et 1406.]

### 1.2 Loi sur la concurrence (fédérale)
- **Art. 74.01(1)(a)** (et 52) : indication fausse ou trompeuse sur un point important, jugée selon l'impression générale. **74.01(1)(b)** : toute affirmation de rendement ou d'efficacité doit reposer sur une épreuve adéquate et appropriée. **74.01(1.1) / 52(1.3)** : le prix annoncé doit être atteignable (frais obligatoires inclus). **74.02** : tests et témoignages ne peuvent être utilisés sans autorisation ni déformés. [V : https://laws-lois.justice.gc.ca/eng/acts/c-34/section-74.01.html ; https://competition-bureau.canada.ca/deceptive-marketing-practices/general-impression-test]
- Application : pas de « meilleure note garantie », « +15 % en maths », « experts » ; un témoignage vient d'une personne réelle et consentante (le parent, si l'élève est mineur) et reflète une expérience typique ; pas de rareté ni compte à rebours fictifs. Décrire le contenu de la séance, pas un résultat promis.

### 1.3 Loi 25 (Loi sur la protection des renseignements personnels dans le secteur privé, RLRQ c. P-39.1)
- **Mineurs** : sous 14 ans, le consentement relève du titulaire de l'autorité parentale ; de 14 à 17 ans, le mineur consent seul (le parent peut aussi). [V : https://www.fasken.com/fr/knowledge/loi-25/29-pl64-c-comme-consentement ; CAI https://www.cai.gouv.qc.ca/uploads/Actualit%C3%A9s/2024-01-04_DOC-2.pdf]
- **Technologies d'identification, de localisation ou de profilage (art. 8.1)** : informer la personne, fonctions désactivées par défaut. Donc pixel Meta/Snap, Google Analytics et autres témoins ne se chargent qu'après consentement actif, sans consentement implicite. [V : sources ci-dessus ; source secondaire https://flexyconsent.com/blog/quebec-law-25-cookie-consent-guide/] Le dépôt a déjà un bandeau avant Google Analytics (commit d4c7429).
- **Transferts hors Québec (art. 17)** : EFVP préalable (sensibilité, finalité, protections contractuelles, régime juridique de destination). Visés : Meta, Snap, Boosend, en plus des fournisseurs déjà listés. [V : `docs/legal/03-EFVP-FOURNISSEURS.md`]
- **Principe de la campagne : minimisation.** Aucun courriel, nom, âge ni donnée d'élève envoyé à Meta ou Snap. Pas de liste téléversée en audience personnalisée, pas de Conversions API avec courriel haché.
- Avis : politique de confidentialité claire, responsable de la protection publié, registre des incidents tenu (en place), droits d'accès et de retrait par `/legal/contact`.
- **Âge dans les DM** : n'en demander aucun (cohérent avec le site). Si un DM indique clairement moins de 14 ans, ne rien conserver et inviter à en parler à un parent.

### 1.4 LCAP / CASL
- Un message électronique commercial (courriel, texto, **message direct de réseau social**) exige : consentement (exprès ou implicite), identification de l'expéditeur, coordonnées (dont adresse postale), mécanisme de désabonnement gratuit et simple, appliqué dans les 10 jours ouvrables. [V : https://crtc.gc.ca/eng/com500/guide.htm ; https://www.sender.net/blog/casl-compliance/ ; DM de réseaux sociaux visés : source secondaire https://cyberimpact.com/fr/blog/casl-compliance-must-know]
- Consentement implicite : relation d'affaires existante (achat récent, demande de renseignements récente). [A : durées exactes (2 ans / 6 mois) à confirmer sur le site du CRTC.] Consentement exprès : action proactive de la personne (case non précochée, bouton « Oui »).
- **DM déclenché par un commentaire** : écrire « VOTE » ou « INFO » est une demande d'information, qui soutient un DM unique de réponse. Comme il sert aussi la promotion, il contient identification + adresse + désabonnement. Tout envoi **ultérieur** (rappel de vote, annonce du sujet, offre du jeudi) exige un consentement exprès via un bouton distinct, non précoché (« Oui, rappelle-moi »). [A : qualification à faire valider ; approche prudente retenue]
- **Limite plateforme** : une seule réponse privée par commentaire, dans les 7 jours ; autres messages seulement si la personne répond, dans les 24 h. [V : sources secondaires https://www.socialpilot.co/strategy/instagram-comment-to-dm-automation ; https://www.sirency.com/blog/instagram-dm-automation-rules ; [A] contrôler la doc Meta officielle.] Les rappels passent donc par le courriel (consentement du formulaire de vote), pas par des DM hors fenêtre.
- **Mineurs** : la LCAP n'a pas de règle d'âge propre ; limiter les DM à un message informatif + lien vers le site, où s'applique la case « 14 ans et plus ou parent ».

### 1.5 Charte de la langue française
- La publicité commerciale diffusée au Québec, y compris sur les réseaux sociaux et un site, doit être en français (art. 52) ; une autre langue ne peut dominer. Des dispositions modifiées sont en vigueur depuis le 1er juin 2025. [V : https://www.smartbiggar.ca/insights/publication/quebecs-french-language-requirements-for-commerce-and-business-reform-of-the-charter-of-the-french-language ; https://www.legisquebec.gouv.qc.ca/fr/tdm/rc/C-11,%20r.%209/20240711]
- La marque « RPVD Success » peut rester telle quelle (marque de commerce). Toujours l'accompagner d'un descripteur français (« atelier en direct de 1 h 30 sur Zoom »). [A : le mot « bootcamp » est utilisé comme nom de produit ; un descripteur français adjacent règle le risque.]

### 1.6 Plateformes
**Meta (Facebook / Instagram)**
- Pour les moins de 18 ans, le ciblage est limité à l'âge et à l'emplacement ; fin du ciblage par genre et par activité (pages aimées, comptes suivis). [V : https://searchengineland.com/meta-introduces-new-ad-targeting-limits-for-teens-391259] Des sources tierces évoquent des restrictions supplémentaires en 2026 (https://www.auditsocials.com/blog/meta-teen-ad-targeting-restrictions-parental-controls-2026-age-gated-campaigns) : source faible, [A] vérifier dans Ads Manager.
- Pas de promesses de résultats irréalistes ; affirmations crédibles et vérifiables. [V : https://transparency.meta.com/policies/ad-standards/deceptive-content/unrealistic-outcomes]
- Attributs personnels : le texte ne doit pas sous-entendre qu'on connaît la situation de la personne (« toi qui échoues en maths »). [V : résumé https://lseo.com/paid-media/paid-social-media-marketing/comply-with-meta-ads-policies-guidelines-effectively/ ; [A] confirmer sur transparency.meta.com]
- Audiences personnalisées et similaires : à éviter avec des mineurs.

**Snapchat**
- Application 13+ : Snap rejette les pubs adressées ou attrayantes pour les moins de 13 ans, rejette les offres fausses ou trompeuses, exige que les affirmations soient prouvables sur demande, et exige une politique de confidentialité accessible là où l'on collecte des données. [V : https://snap.com/en-US/ad-policies?lang=en-GB ; https://values.snap.com/policy/general-requirements]
- Pour les 13-17 ans, des options de ciblage sont retirées (intérêts, listes de clients, etc.), confirmé pour l'UE/R.-U. depuis 2023 ; Canada : [A] vérifier dans Snap Ads Manager. [https://developers.snap.com/api/marketing-api/Ads-API/announcements]
- Pixel Snap : même règle que Meta (après consentement, aucune donnée d'élève).

## 2. FAIRE / NE PAS FAIRE

### 2.1 Textes
FAIRE
- Écrire en français ; tutoiement (ados), vouvoiement (parents).
- Utiliser seulement des faits vrais : « 20 $ tout inclus », « 1 h 30 en direct sur Zoom le dimanche », « Sec 1 à 5 », « places limitées à 90 par salle », « ventes fermées samedi 23 h 59 », « remboursement intégral jusqu'à samedi 23 h 59 », « le sujet est choisi par le vote ».
- Décrire le contenu (« on résume les principes et on vulgarise la démarche »), pas un résultat.
- Afficher sur la page d'arrivée : prix total, nom du commerçant, ville, politique de remboursement.
- Parents : décision du parent, remboursement, sécurité (caméras coupées, aucun enregistrement, aucun nom demandé).

NE PAS FAIRE
- « Réussite garantie », « +X % de note », « meilleurs profs », « experts », « n° 1 ».
- Fausse urgence : « Plus que 3 places ! » (sauf si exact à l'instant), compte à rebours qui se réinitialise.
- Viser la détresse : « Tu vas couler », « Tes parents seront déçus », ou nommer une difficulté personnelle.
- Appel d'achat adressé directement à un enfant ; reformuler : « Parles-en à tes parents ».
- Chiffres non prouvés (« 1000 élèves », « 95 % de réussite »).
- Texte bilingue où l'anglais domine.

### 2.2 Visuels
FAIRE
- Personnes réelles ou illustrations sobres sans caractère enfantin ; adolescents plausiblement 15-17 ans ; captures réelles du site ; mention « Bootcamp RPVD — rpvdsuccess.com ».
- Toute personne identifiable : autorisation écrite (parent si mineur), durée convenue.
- Sous-titres en français pour toute vidéo.

NE PAS FAIRE
- Mascottes, dessins animés, esthétique de jeu pour enfants (critère de la manière, art. 249).
- Faux témoignages, photos de banque d'images présentées comme élèves, faux bulletins, « avant/après » de notes.
- Compteurs de places inventés ; badges « certifié », « approuvé par le ministère ».
- Noms, notes ou visages d'élèves réels sans consentement écrit.

### 2.3 Flux de données
FAIRE
- Ciblage par âge (14-17 ou 15-17) et région pour les ados ; parents 25-60 ans, Estrie/Québec, sans intérêt tiré de l'activité d'un mineur.
- Mesurer avec les rapports natifs + liens UTM + comptage serveur agrégé (votes et billets par source), sans identifiant personnel envoyé aux plateformes.
- Charger tout pixel (Meta, Snap, GA) uniquement après acceptation du bandeau. Recommandation : aucun pixel Meta/Snap au lancement.
- Boosend : garder le strict nécessaire (identifiant Instagram, mot-clé, horodatage) ; suppression à 6 mois comme les votes.
- Inscrire Meta, Snap, Boosend à l'EFVP et à la politique de confidentialité.

NE PAS FAIRE
- Téléverser des courriels (votants, acheteurs) en audience personnalisée ; Conversions API avec courriel haché ; événements d'achat avec montant et courriel.
- Pixel ou balise sur `/vote` ou `/reserver` avant consentement.
- Retargeting de mineurs ; audiences similaires bâties sur des élèves.
- Croiser identifiant Instagram et courriel de billet dans un fichier hors du système.

### 2.4 Automatisations (Boosend, courriel)
FAIRE
- DM unique déclenché par mot-clé : identification (RPVD Success, Sherbrooke), adresse postale, lien `/vote`, « Réponds STOP pour ne plus rien recevoir », lien vers la politique de confidentialité, mention « message automatique ».
- Rappels seulement après bouton de consentement exprès, non précoché ; désabonnement appliqué immédiatement (la loi accorde 10 jours ouvrables).
- Respecter Meta : une réponse privée par commentaire, 7 jours ; 24 h après réponse de la personne.
- Bloquer tout envoi commercial après STOP.
- Courriels : expéditeur `bootcamp@rpvdsuccess.com`, adresse postale, lien de désabonnement (en place).

NE PAS FAIRE
- DM de masse non sollicités, relances multiples, DM à des personnes qui n'ont pas commenté.
- Se faire passer pour une personne alors que c'est un robot.
- Demander âge, nom complet, école ou téléphone dans un DM.
- Laisser une IA répondre librement à une détresse : message fixe et invitation à parler à un adulte de confiance. [A : ajouter une ressource d'aide (ex. Tel-jeunes) après vérification du numéro à jour.]

## 3. Table des flux de données

| # | Source | Destinataire | Donnée envoyée | Base de consentement / fondement | Pays | Statut |
|---|---|---|---|---|---|---|
| 1 | Pub Meta/Snap vue par l'ado | Meta / Snap | Ciblage par âge et région ; aucun identifiant fourni par RPVD | Aucun renseignement personnel de RPVD transmis | USA | OK avec ciblage minimal |
| 2 | Clic sur la pub -> site | RPVD (Netlify) | Paramètres UTM de campagne | Aucun témoin avant consentement | Canada/USA | OK |
| 3 | Pixel Meta/Snap/GA | Meta / Snap / Google | Pages vues, événements, identifiant de navigateur | Consentement actif au bandeau (art. 8.1) ; 14+ seul, sous 14 ans parent | USA | Désactivé par défaut ; recommandé : pas de pixel Meta/Snap au lancement |
| 4 | Commentaire public (mot-clé) | Boosend (via API Meta) | Identifiant Instagram, nom d'utilisateur, texte du commentaire | Demande d'information de la personne ; finalité unique | USA / [A] pays Boosend | EFVP à compléter |
| 5 | DM automatique unique | Utilisateur Instagram | Info + lien `/vote` + identification + adresse + STOP | LCAP : réponse à une demande de renseignements (implicite) ; [A] validation juridique | USA | Permis une fois l'adresse remplie |
| 6 | Bouton « Oui, rappelle-moi » | Boosend | Consentement horodaté, identifiant Instagram | LCAP exprès ; Loi 25 | USA / [A] | Seule voie pour des messages subséquents |
| 7 | Formulaire `/vote` | RPVD (Supabase) | Courriel, niveau, matière, sujet, 2 cases, date | Loi 25 + LCAP exprès ; sans nom ni âge ; suppression à 6 mois | USA | En place (EFVP) |
| 8 | Courriels rappel/annonce | Resend -> utilisateur | Courriel, contenu | LCAP exprès (vote) ou implicite (achat) ; désabonnement | USA | En place |
| 9 | Paiement | Stripe | Courriel, carte (saisie chez Stripe) | Exécution du contrat | USA | En place |
| 10 | Lien Zoom | Zoom -> élève | Courriel, nom affiché « Élève XXXX » | Contrat ; caméras coupées, pas d'enregistrement | USA | En place |
| 11 | Conversions API (achat) | Meta / Snap | Courriel haché, montant | Aucune base valide pour des mineurs | USA | INTERDIT |
| 12 | Liste de courriels -> audience personnalisée | Meta / Snap | Courriels hachés | Aucune base valide pour des mineurs | USA | INTERDIT |

## 4. Liste de contrôle avant lancement
- [ ] Adresse postale renseignée dans `business.json` et déployée.
- [ ] EFVP signée, Boosend/Meta/Snap ajoutés ; politique de confidentialité à jour.
- [ ] Ciblage : âge min. 14 (ou 15) ; pas d'audience personnalisée ni similaire ; pas de Conversions API.
- [ ] Bandeau cookies actif ; aucun pixel avant acceptation.
- [ ] DM Boosend : identification, adresse, STOP, un seul message ; rappels derrière un bouton de consentement.
- [ ] Textes relus contre 2.1, visuels contre 2.2 ; aucun compteur ni témoignage non réel.
- [ ] Prix 20,00 $ tout inclus et remboursement jusqu'à samedi 23 h 59 visibles sur la page d'arrivée.
- [ ] Validation par un avocat avant d'augmenter le budget (points [A]).

## 5. Sources consultées
- OPC : https://www.opc.gouv.qc.ca/en/commercant/pratique-commerce/publicite-loi/publicite-enfant/ ; https://cdn.opc.gouv.qc.ca/media/documents/consommateur/bien-service/index-sujet/guide-application.pdf
- Loi sur la concurrence : https://laws-lois.justice.gc.ca/eng/acts/c-34/section-74.01.html ; https://competition-bureau.canada.ca/deceptive-marketing-practices/general-impression-test
- Loi 25 : https://www.cai.gouv.qc.ca/uploads/Actualit%C3%A9s/2024-01-04_DOC-2.pdf ; https://www.fasken.com/fr/knowledge/loi-25/29-pl64-c-comme-consentement
- LCAP : https://crtc.gc.ca/eng/com500/guide.htm
- Charte : https://www.smartbiggar.ca/insights/publication/quebecs-french-language-requirements-for-commerce-and-business-reform-of-the-charter-of-the-french-language ; https://www.legisquebec.gouv.qc.ca/fr/tdm/rc/C-11,%20r.%209/20240711
- Meta : https://searchengineland.com/meta-introduces-new-ad-targeting-limits-for-teens-391259 ; https://transparency.meta.com/policies/ad-standards/deceptive-content/unrealistic-outcomes
- Snap : https://snap.com/en-US/ad-policies?lang=en-GB ; https://values.snap.com/policy/general-requirements
- Inaccessibles aujourd'hui (404/403) : about.fb.com, Légis Québec ; points concernés marqués [A].
