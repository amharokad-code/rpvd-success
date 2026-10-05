# Bootcamp RPVD — Système complet

**RPVD = Résumer les Principes, Vulgariser la Démarche.** Session de 1 h 30 en direct sur Zoom, le dimanche, 20,00 $ CAD tout inclus, Sec 1 à 5 (maths CST/TS/SN, science ST/STE Sec 4, chimie et physique Sec 5, français). Rôle : produit d'entrée à fort volume qui alimente l'outil d'analyse (`/app`).

## Les pages

| Adresse | Rôle |
|---|---|
| `rpvdsuccess.com/` | Page principale : sessions du dimanche (places en temps réel), vote, fonctionnement, FAQ |
| `rpvdsuccess.com/vote` | Lien court pour les pubs et stories : ouvre directement le formulaire |
| `/reserver?s=…` | Récapitulatif + politique + paiement Stripe 20 $ |
| `/merci` | Après paiement : prochaines étapes + ajout au calendrier |
| `/rembourser?t=…` | Gérer / annuler (lien unique dans le courriel de confirmation) |
| `/admin/bootcamp` | Tableau de bord interne (jeton `BOOTCAMP_ADMIN_TOKEN`) |
| `/legal/refunds` | Politique de remboursement (section Bootcamp) |

## Ce qui tourne tout seul (tâche planifiée toutes les 10 min)

| Quand (heure du Québec) | Automatique |
|---|---|
| Lun → mer | Votes. Chaque votant reçoit un courriel de confirmation. Un vote jeu-dim compte pour la semaine suivante. |
| **Jeudi 17 h** | Si l'admin n'a rien créé : les 4 sujets les plus votés deviennent les sessions 13 h / 15 h / 17 h / 19 h (du plus voté au moins voté), réunion Zoom créée, courriels « SÉLECTIONNÉ » (avec lien de réservation) et « pas ce dimanche » (avec les 4 sessions ouvertes à tous). |
| Jeu → **sam 23 h 59** | Ventes à 20 $. Places limitées à 90 par session (réglable). Remboursement intégral en libre-service. |
| Paiement | Webhook Stripe → billet confirmé → inscription Zoom (lien personnel) → courriel de confirmation (détails, règles, bouton d'annulation). |
| Sam 23 h 59 → dim 8 h | Ventes fermées. |
| **Dim 8 h** | Seules les places libérées par de VRAIS remboursements sont remises en vente (non remboursables). Courriel « N places libérées » aux votants de ce sujet sans billet. |
| **T-60 min** | Lien Zoom personnel envoyé à chaque billet payé (au plus tard jusqu'à 15 min après le début). |
| Fin du cours | Session marquée terminée. |
| **Lundi 9 h** | Courriel de suivi : passerelle vers l'outil d'analyse + lien pour revoter. |

L'admin peut tout faire plus tôt ou à la main : sélection auto en un clic, choix manuel des sujets et des créneaux, essai à blanc des courriels, envoi des liens, annulation d'une session avec remboursement automatique de tous les billets, export CSV des participants, texte du post « places libérées » prêt à copier.

## Ce qu'un humain fait encore (impossible à automatiser)

1. **Jeudi soir → samedi** : préparer les 4 cours (démarche en 3-4 étapes, 3-4 exercices-pièges, fiche des règles d'or). Gabarit : `05-RUN-SHEET-SESSION.md`.
2. **Dimanche** : donner les 4 cours en direct (hôte Zoom).
3. **Réseaux sociaux** : publier les posts de `03-POSTS-SOCIAUX.md` (le post du dimanche 8 h se copie depuis l'admin, avec le vrai nombre de places libérées).

## Configuration à finir (comptes et secrets à ton nom)

Détail pas à pas : `02-ZOOM-RESEND-STRIPE.md`. L'admin affiche en haut l'état de chacun (vert/rouge).

- [ ] **Resend** : `RESEND_API_KEY` + domaine vérifié + `EMAIL_FROM` (sinon AUCUN courriel ne part).
- [ ] **`EMAIL_REPLY_TO`** : l'adresse où arrivent les réponses des élèves et parents.
- [ ] **Zoom Pro** + application Server-to-Server OAuth : `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`. Sans ça : colle un lien Zoom par session dans l'admin (lien commun, salle d'attente conseillée).
- [ ] **Achat test** : réserver une vraie place à 20 $ puis se rembourser depuis le courriel (vérifie Stripe, webhook, courriels, Zoom de bout en bout).
- [x] Stripe live + webhook (déjà en place, le Bootcamp utilise le même webhook).
- [x] `BOOTCAMP_ADMIN_TOKEN`.
- [x] Base de données (tables `bootcamp_*`).

## Honnêteté (non négociable, et c'est ce qui rend la rareté crédible)

- « Places limitées » : vrai, plafond réel affiché en temps réel.
- « Ton sujet a été SÉLECTIONNÉ » : vrai, c'est le résultat du vote.
- Date limite du samedi 23 h 59 : réelle, les ventes ferment vraiment.
- « N places libérées » le dimanche : uniquement si N désistements ont réellement eu lieu ; le site et l'admin calculent N, jamais inventé. Si N = 0, pas de post.
- « 20 $ tout inclus » : le montant affiché est le montant payé. Si tu es inscrit aux taxes (TPS/TVQ), tu peux écrire « taxes incluses ».

## KPI (lundi, depuis l'admin)

| KPI | Où | Cible de départ |
|---|---|---|
| Votes / semaine | Admin → Votes | 150+ |
| Billets / session | Admin → Sessions | 40 → 85 |
| Revenu / dimanche | Admin → Revenu de la semaine | 2 400 $ → 5 400 $ |
| Taux de remboursement | Remboursés / payés | < 10 % |
| Bootcamp → outil | Analytics `source=bootcamp` | 10 % |
