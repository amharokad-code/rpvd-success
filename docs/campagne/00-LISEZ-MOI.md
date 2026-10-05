# Campagne Bootcamp RPVD — dossier de lancement (Meta, Snapchat, automatisation)

Dernière mise à jour : 2026-10-05. Tout est prêt à copier-coller. **Ce qui reste pour toi : vérification d'identité + carte bancaire** (Meta Business, Snapchat Ads) et 6 réglages listés dans `05-CHECKLIST-LANCEMENT.md`.

| Fichier | Contenu |
|---|---|
| `01-META-ADS.md` | Structure complète de la campagne Facebook/Instagram (objectif Ventes), audiences, budgets, textes, UTM |
| `02-SNAPCHAT.md` | Campagne Snapchat (conversions sur le site) |
| `03-COMMENTAIRE-VERS-DM.md` | Automatisation « commente CLUTCH → reçois le lien en message privé » |
| `04-CREATIFS.md` | Prompts d'images, scripts vidéo, boucles animées cliquables, règles de conformité |
| `05-CHECKLIST-LANCEMENT.md` | Les étapes dans l'ordre, qui fait quoi, test avant de dépenser 1 $ |

## Ce qui est déjà branché dans le code (testé : `npm test`, `npm run build`)
- **Pixel Meta** (navigateur) : `PageView`, `ViewContent`, `Lead` (vote), `InitiateCheckout`. Il ne se charge **que si le visiteur clique « Tout accepter »** dans le bandeau (Loi 25) et que `VITE_META_PIXEL_ID` existe. → `src/utils/meta-pixel.js`.
- **Conversions API** (serveur) : l'événement `Purchase` (20,00 $ CAD, `event_id = bootcamp-<billet>`) part du webhook Stripe **après paiement confirmé**, une seule fois, seulement si l'acheteur avait accepté les cookies marketing. **Avant ce changement, aucun achat du Bootcamp ne remontait à Meta** : une campagne « Ventes » aurait été aveugle.
- **Politique de confidentialité** (FR/EN) mise à jour pour dire exactement ça (avant : « aucune donnée du Bootcamp n'est transmise à Meta », ce qui aurait été faux). **À faire relire par ton avocat/notaire.**
- **Liens Zoom personnels automatiques : déjà en place** (`_lib/zoom.js`, `_lib/bootcamp-ops.js`, tâche planifiée `bootcamp-cron` toutes les 10 min). Chaque billet payé = un inscrit Zoom avec son lien unique (un appareil), envoyé automatiquement **60 minutes avant** le cours (constante `LINK_LEAD_MIN`), remboursement = désinscription. Il manque seulement `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` (voir `docs/academie/02-ZOOM-RESEND-STRIPE.md`). Je n'ai pas écrit un second script : ça aurait dupliqué et risqué de casser l'existant.
- Courriels (vote, sélection, confirmation, lien Zoom, remboursement, suivi) : déjà automatiques via Resend (`docs/academie/04-COURRIELS.md`). Pas besoin de Tally : le formulaire de vote est sur `/vote`.

## Ce que je n'ai PAS fait, et pourquoi
1. **Créer les comptes et campagnes dans Meta Ads Manager / Snapchat Ads Manager** : je n'ai aucun accès à ces interfaces (les outils Meta disponibles ici gèrent les *apps développeur*, pas les campagnes) et la politique du projet est de ne jamais coller de jeton publicitaire dans un chat. Tout est donc écrit pour être saisi en ~30 min.
2. **Générer les images/vidéos finales** : aucun générateur de vidéo n'est branché ici. `04-CREATIFS.md` contient les prompts et les storyboards prêts pour Canva/Runway/CapCut.
3. **Compteur truqué « 87/100 places »** : la politique du projet et la loi (LPC, pratiques commerciales trompeuses) l'interdisent. Les créatifs utilisent le **vrai** nombre de places restantes (bouton « Copier un post promo » dans `/admin/bootcamp`).
4. **Cibler les 13-17 ans par intérêts** : Meta et Snapchat ne l'autorisent pas pour les mineurs (âge + lieu seulement), et un mineur ne peut pas payer : l'ensemble « Parents » est celui qui vend.
5. **Contourner des permissions** : rien à contourner ; je travaille dans le dépôt avec les droits normaux.
