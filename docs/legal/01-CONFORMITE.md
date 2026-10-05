# Conformité légale — Bootcamp RPVD et site (Québec)

Repères seulement, pas un avis juridique : fais valider par un avocat ou un notaire avant de grossir, surtout la partie « publicité aux jeunes ».

## Principe appliqué partout : minimum de données

| On demande | On ne demande JAMAIS |
|---|---|
| Courriel (vote, billet) | Nom, prénom |
| Niveau, matière, sujet voté | Âge, date de naissance |
| 2 cases à cocher (consentement, 14 ans+ ou parent) | Adresse, téléphone, école |
| | Photo, caméra |

- Zoom : l'élève apparaît comme « Élève XXXX » (code), caméra désactivée, micro coupé, ouvert seulement sur invitation.
- Supprimé du code : champ « examens de la semaine », stockage de l'IP avec le vote, nom de l'acheteur (Stripe le demande pour la carte ; on ne le garde pas).

## Lois couvertes et ce qui est en place

### Loi 25 (protection des renseignements personnels, secteur privé)
- [x] Politique de confidentialité claire, publiée : `/legal/privacy` (inclut la section gouvernance exigée).
- [x] Responsable de la protection des renseignements personnels : titre et courriel publiés (par défaut, la plus haute autorité de l'entreprise = un cofondateur).
- [x] Consentement : case obligatoire au vote, date du consentement enregistrée.
- [x] Mineurs : 14 ans et plus consentent seuls ; moins de 14 ans, case « je suis le parent qui remplit ». Aucun âge collecté.
- [x] Conservation limitée, appliquée automatiquement : votes supprimés après 6 mois ; courriel et lien Zoom des billets effacés après 6 mois (montant/date/référence gardés 6 ans pour la comptabilité).
- [x] Droits (accès, copie, correction, suppression, retrait du consentement, plainte à la CAI) : formulaire `/legal/contact`, réponse sous 30 jours.
- [x] Fournisseurs hors Québec listés dans la politique ; évaluation dans `03-EFVP-FOURNISSEURS.md`.
- [ ] **À faire par toi** : relire et signer l'évaluation `03-EFVP-FOURNISSEURS.md` (une fois).
- [ ] **À faire par toi** : tenir le registre `04-REGISTRE-INCIDENTS.md` (même vide, il doit exister).

### Loi sur la protection du consommateur (contrats à distance)
- [x] Avant le paiement (`/reserver`) : description, date, durée, prix total, politique de remboursement, identité du commerçant.
- [x] Courriel de confirmation = copie du contrat (détails, référence, conditions, lien d'annulation).
- [x] Prix affiché = prix payé (« 20 $ tout inclus »).
- [x] Aucune clause qui retire les droits du consommateur ; aucune garantie de note.
- [ ] **À faire par toi** : remplir `postalAddress` dans `src/legal/business.json` (adresse civique ou case postale). Obligatoire : elle s'affiche alors partout (pages légales, `/reserver`, chaque courriel). Un seul fichier à modifier, puis pousser sur `main`.

### Loi anti-pourriel (LCAP)
- [x] Consentement explicite à la case du vote (ou implicite après un achat).
- [x] Chaque courriel identifie l'expéditeur (nom, adresse, courriel).
- [x] Chaque courriel d'annonce a un lien « Ne plus recevoir les annonces » (page `/desabonner`) + désabonnement en un clic dans Gmail/Outlook (en-tête List-Unsubscribe), appliqué immédiatement.
- [x] Les désabonnés sont exclus de toutes les annonces ; revoter = nouveau consentement.
- [ ] Dépend aussi de l'adresse postale ci-dessus.

### Publicité destinée aux enfants (Loi sur la protection du consommateur, art. 248-249)
Au Québec, la publicité commerciale destinée aux moins de 13 ans est interdite. Les élèves de Sec 1 ont 12-13 ans.
- [x] Le site s'adresse aux élèves du secondaire et à leurs parents, sans personnages ni ton enfantin.
- [ ] **Tes pubs Meta/TikTok** : cible 13 ans et plus + les parents, jamais un créneau ou un style « enfants ». Pour Sec 1, adresse la pub au parent (« Votre enfant a un examen… »).

### Taxes (TPS/TVQ)
- Sous 30 000 $ de revenus sur 4 trimestres : petit fournisseur, pas de taxes à facturer. « 20 $ tout inclus » reste vrai dans tous les cas. Au-delà, inscription obligatoire : parles-en à un comptable (le tutorat peut être exonéré, à valider).

## Ce qui reste à faire, en résumé (toi seulement)

1. Adresse postale dans `src/legal/business.json`.
2. Vérifier que `support@rpvdsuccess.app` reçoit vraiment les courriels (c'est l'adresse officielle affichée partout). Sinon, remplace `email` dans le même fichier.
3. Réglages Zoom du compte : `02-ZOOM-PROTECTION-ELEVES.md` (10 minutes, une fois).
4. Signer `03-EFVP-FOURNISSEURS.md`, garder `04-REGISTRE-INCIDENTS.md`.
5. Cibler les pubs 13 ans et plus + parents.
