# Brancher Resend, Zoom et vérifier Stripe

Toutes les variables vont dans **Netlify → rpvdsuccess → Project configuration → Environment variables**, case « Contains secret values » cochée pour les secrets. Après chaque ajout : **Deploys → Trigger deploy → Deploy project**. Puis ouvre `/admin/bootcamp` : la pastille correspondante doit passer au vert.

## 1. Resend (courriels) — sans ça, aucun courriel ne part

1. resend.com → crée le compte.
2. **Domains → Add domain** → `rpvdsuccess.com` → ajoute chez ton registraire de domaine les enregistrements DNS affichés (DKIM, SPF) → attends « Verified ».
3. **API Keys → Create API key** (accès « Sending access »).
4. Netlify :
   - `RESEND_API_KEY` = la clé `re_…` (secret)
   - `EMAIL_FROM` = `Bootcamp RPVD <bootcamp@rpvdsuccess.com>`
   - `EMAIL_REPLY_TO` = l'adresse que tu lis vraiment (réponses des élèves et parents)
5. **Volume** : le plan gratuit de Resend est limité (environ 100 courriels par jour). Avec 200 votants + confirmations + liens + suivis, il faut le plan payant d'entrée de gamme (environ 20 $ US / mois). Vérifie les limites actuelles sur leur page de prix.

## 2. Zoom (liens personnels automatiques)

1. Abonnement **Zoom Pro** (réunions jusqu'à 100 participants, inscription obligatoire).
2. marketplace.zoom.us → **Develop → Build App → Server-to-Server OAuth** → nomme-la « RPVD Bootcamp ».
3. **Scopes** : autorise la création / suppression de réunions et la gestion des inscrits (cherche « meeting » : écriture des réunions, écriture des inscrits, mise à jour du statut des inscrits).
4. **Activate** l'app, puis copie depuis « App Credentials » :
   - `ZOOM_ACCOUNT_ID`
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET` (secret)
5. Résultat : chaque session crée sa réunion (90 min, inscription obligatoire, un appareil par lien, aucun courriel Zoom). Chaque billet payé devient un inscrit avec son lien personnel, envoyé par RPVD 30-60 min avant. Un billet remboursé est désinscrit.
6. Pour une session déjà créée avant la configuration : bouton « Créer la réunion Zoom automatique » dans l'admin, ou la tâche planifiée la crée toute seule au passage suivant.

**Plan B sans API Zoom** : dans l'admin, colle sur chaque session le lien d'une réunion Zoom créée à la main (avec salle d'attente activée). Le même lien est envoyé à tous les payés 30-60 min avant ; l'hôte admet les participants.

## 3. Stripe (déjà branché, à vérifier une fois)

- Le Bootcamp utilise la clé et le webhook existants (`checkout.session.completed`). Rien à créer : le produit à 20,00 $ CAD est généré à chaque paiement.
- Recommandé : Stripe → **Settings → Customer emails → Successful payments** activé, pour que l'acheteur reçoive aussi le reçu Stripe officiel.
- **Achat test réel** : `/` → réserve une place → paie 20 $ avec ta carte → vérifie le courriel de confirmation → clique « Gérer / annuler » → rembourse-toi. Contrôle dans Stripe → Payments que le paiement est remboursé, et dans l'admin que les compteurs ont bougé.

## 4. Réglages dans l'admin

- **Sélection automatique du jeudi 17 h** : active par défaut. Décoche si tu veux toujours choisir toi-même.
- **Places par session** : 90 par défaut (salle Zoom de 100, marge de 10).
