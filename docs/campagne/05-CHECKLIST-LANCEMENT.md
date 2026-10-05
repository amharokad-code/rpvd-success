# Checklist de lancement — dans l'ordre

## A. Toi uniquement (identité + paiement)
- [ ] Meta Business Manager : vérification d'identité/entreprise, moyen de paiement.
- [ ] Snapchat Ads Manager : vérification d'identité, moyen de paiement.
- [ ] (Stripe : le compte est déjà actif.)

## B. Réglages à faire une fois (10 min, copie-colle)
Netlify → Project configuration → Environment variables (puis **Deploy project**) :
| Variable | Valeur | Secret ? |
|---|---|---|
| `VITE_META_PIXEL_ID` | ID du pixel (nombres) | non (public) |
| `META_PIXEL_ID` | même ID | non |
| `META_CAPI_ACCESS_TOKEN` | jeton Conversions API | **oui** |
| `META_CAPI_TEST_EVENT_CODE` | code de l'onglet « Événements test » (**à retirer avant la vraie campagne**) | non |
| `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | app Zoom Server-to-Server | **oui** |
Autres : `postalAddress` dans `src/legal/business.json` (obligatoire avant toute pub) ; rotation des clés exposées (`PROJECT_HANDOFF.md` §7).

## C. Test avant de dépenser 1 $
1. Ouvre `https://rpvdsuccess.com` en navigation privée, clique **Tout accepter**.
2. Gestionnaire d'événements Meta → **Événements test** → saisis l'URL : tu dois voir `PageView`, `ViewContent`.
3. Vote → `Lead`. Va à `/reserver?s=…` → clique payer → `InitiateCheckout`.
4. Paie 20 $ avec ta vraie carte (puis rembourse-toi depuis le courriel) → l'événement **`Purchase` (serveur)** apparaît avec 20,00 CAD, avec source « Serveur ».
5. Refais le test en cliquant **Refuser** : aucun événement ne doit apparaître (preuve de conformité).
6. Retire `META_CAPI_TEST_EVENT_CODE`, redéploie.

## D. Montage des campagnes (≈ 1 h)
- [ ] Meta : suivre `01-META-ADS.md` (3 ensembles, 11 créatifs, textes).
- [ ] Automatisation commentaire→DM : `03-COMMENTAIRE-VERS-DM.md`.
- [ ] Snapchat : `02-SNAPCHAT.md` (après la 1ʳᵉ semaine Meta, ou en parallèle avec 20 $/j).
- [ ] Publier d'abord en **brouillon**, Meta examine les pubs (jusqu'à 24 h).

## E. Rythme hebdomadaire (rien à faire à la main sauf les pubs)
Lun : pubs « vote » · Jeu 17 h : sélection auto → couper « vote », lancer « vente » avec `{sujet}` et `{N}` · Ven/Sam : retargeting · Sam 23 h 59 : ventes closes · Dim : cours, lien Zoom auto T-60 · Lun 9 h : courriel de suivi (passerelle vers l'outil d'analyse).

## F. Avant de dépenser plus de 500 $
Avocat/notaire : relire la politique de confidentialité mise à jour (Meta), la publicité aux 13-17 ans, la TPS/TVQ si le seuil de 30 000 $ approche.
