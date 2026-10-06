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
- [ ] **Tes pubs Meta/TikTok** : cible 14 ans et plus + les parents (jamais en dessous de 14 ans), jamais un créneau ou un style « enfants ». Pour Sec 1, adresse la pub au parent (« Votre enfant a un examen… »).

### Pixels et API de conversions (Meta, Snap) — Loi 25, LCAP, politiques des plateformes
- [x] Aucun pixel ni témoin marketing avant consentement : Meta Pixel et Snap Pixel ne sont téléchargés qu'après « Tout accepter » (`src/utils/ads.js`, décision unique dans `src/utils/ads-core.mjs`). Refus ou retrait = plus aucun envoi, témoins `_fbp`, `_fbc`, `_scid` supprimés, identifiants de clic effacés de la session.
- [x] Retrait aussi simple que l'acceptation : lien « Gérer mes cookies » au bas des pages du Bootcamp (rouvre le bandeau).
- [x] Les pixels ne tournent que sur `/`, `/vote`, `/bootcamp`, `/reserver`, `/merci`, `/accueil` : jamais sur les pages dont l'URL porte un identifiant (`/rembourser?t=`, `/desabonner?v=`, `/admin`, `/app`, `/legal`), car un pixel envoie l'URL complète à Meta/Snap.
- [x] Aucune donnée personnelle dans le pixel : ni courriel ni nom ; Meta en `autoConfig: false` (pas de correspondance avancée automatique) ; Snap initialisé sans `user_email`.
- [x] API de conversions (Purchase) : seulement avec la case facultative de `/reserver` (non cochée d'avance, `marketing_consent === true`, inscrite `mk=1` dans les métadonnées Stripe). Sans case : aucun envoi, et ni IP, ni agent utilisateur, ni identifiant de clic, ni témoin n'est lu ni gardé.
- [x] Envoyé à Meta/Snap avec la case : montant, devise, heure, courriel haché SHA-256 (jamais en clair), IP, agent utilisateur, fbp/fbc/ScCid/_scid si présents. Ces valeurs transitent par les métadonnées de la session Stripe de ce paiement.
- [x] L'ancien envoi à Meta des abonnements de l'outil d'analyse (courriel haché, sans consentement) est supprimé : le tunnel d'abonnement ne collecte pas ce consentement, donc il n'envoie plus rien.
- [x] Provenance (`src`, `utm_*`) : étiquettes de campagne validées et tronquées côté serveur, gardées avec le vote ou le billet (colonne `source`, format `src|medium|campagne|contenu`). Aucun identifiant de clic n'est stocké dans la base de données.
- [x] Textes légaux à jour : politique de confidentialité (« Mesure de nos publicités »), liste des fournisseurs, politique de cookies.
- [ ] **À faire par toi** : ajouter Meta et Snap à `03-EFVP-FOURNISSEURS.md` (fournisseurs hors Québec ; données : courriel haché, IP, agent utilisateur, identifiants de clic) et signer.
- [ ] **À faire par toi** : dans Meta Events Manager et Snap Events Manager, désactiver la correspondance avancée automatique (voir `campagne/08-suivi-et-tracking.md`).
- Limite assumée : un événement déjà transmis ne peut pas être rappelé ; le retrait après coup passe par `/legal/contact` (et par les outils de suppression de Meta/Snap).

### Taxes (TPS/TVQ)
- Sous 30 000 $ de revenus sur 4 trimestres : petit fournisseur, pas de taxes à facturer. « 20 $ tout inclus » reste vrai dans tous les cas. Au-delà, inscription obligatoire : parles-en à un comptable (le tutorat peut être exonéré, à valider).

## Ce qui reste à faire, en résumé (toi seulement)

1. Adresse postale dans `src/legal/business.json`.
2. L'adresse officielle affichée partout est `rpvdsuccess@gmail.com` (l'ancienne `support@rpvdsuccess.app` n'existait pas : le domaine `.app` n'est pas enregistré). Vérifie que tu lis cette boîte, sinon change `email` dans le même fichier.
3. Réglages Zoom du compte : `02-ZOOM-PROTECTION-ELEVES.md` (10 minutes, une fois).
4. Signer `03-EFVP-FOURNISSEURS.md`, garder `04-REGISTRE-INCIDENTS.md`.
5. Cibler les pubs 14 ans et plus + parents.
6. Pixels et API de conversions : renseigner les variables (voir `campagne/08-suivi-et-tracking.md`), compléter l'EFVP (Meta, Snap).
