# Meta Ads (Facebook + Instagram) — campagne « Bootcamp RPVD — Ventes »

## 1. Prérequis (une fois)
1. Business Manager (business.facebook.com) au nom de l'entreprise, **vérification d'identité/entreprise** (toi).
2. Page Facebook + compte Instagram professionnel reliés au Business Manager.
3. **Vérification du domaine** `rpvdsuccess.com` (Business Manager → Sécurité de la marque → Domaines) : enregistrement TXT chez Netlify DNS.
4. Créer le **Pixel** (Gestionnaire d'événements → Connecter des sources de données → Web → Pixel). Noter l'ID.
5. **Jeton Conversions API** (Paramètres du pixel → Conversions API → Générer un jeton d'accès) et **code de test** (onglet Événements test).
6. Netlify → variables (voir `05-CHECKLIST-LANCEMENT.md`) : `VITE_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, puis redéployer.

## 2. Campagne
- **Objectif : Ventes** (Sales / OUTCOME_SALES). Jamais Notoriété/Trafic.
- **Emplacement de la conversion : Site web.** **Événement de conversion : Achat (Purchase).**
- Nom : `RPVD | Ventes | Bootcamp | 2026-10`
- Budget au niveau de la campagne (Advantage campaign budget) : **50 $ CAD/jour** pour démarrer (≈ 15-25 achats/semaine si le coût par achat est de 10-15 $ ; Meta veut ~50 achats/semaine pour sortir de la phase d'apprentissage — tant que tu n'y es pas, **ne modifie pas** les ensembles avant 3-4 jours).
- Catégorie spéciale : aucune (éducation n'en est pas une). Attribution : 7 jours clic / 1 jour vue (défaut).
- Plafond d'enchère : aucun au départ (coût le plus bas).

## 3. Ensembles de publicités
| # | Nom | Audience | Placements | Rôle |
|---|---|---|---|---|
| A | `PARENTS-QC` | Québec (+ rayon 25 km des grandes villes OK), **35-55 ans**, Advantage+ audience avec suggestion « parents d'adolescents » (ne pas verrouiller par intérêt) | Fil Facebook, fil Instagram, Reels, Stories, Messenger | **L'ensemble qui vend** : il paie |
| B | `ELEVES-QC` | Québec, **13-17 ans, âge + lieu seulement** (aucun intérêt possible pour les mineurs). Advantage+ audience. | Reels, Stories, Explorer Instagram | Portée + votes + commentaires CLUTCH ; achat par un parent |
| C | `RETARGETING` | Visiteurs du site 14 j + a voté 30 j **moins** acheteurs 14 j (audiences personnalisées depuis le pixel ; n'existent que pour ceux qui ont accepté les cookies) | Tous | Rappel vendredi-samedi (ouvre dès ~1 000 visiteurs) |

Départ : A = 60 %, B = 25 %, C = 15 % (laisse Meta répartir ; ne force pas).
Horaire : diffusion **lundi → samedi 23 h 59** (ventes fermées après). Tu peux laisser tourner en continu ; les textes changent selon la phase de la semaine :
- Lun-Mer : **vote** (`/vote`, événement `Lead`), objectif secondaire.
- Jeu-Sam : **vente** (`/`), c'est ce que l'objectif Ventes optimise. Coupe les pubs « vote » le jeudi 17 h.

## 4. URLs et suivi (à coller dans « Paramètres d'URL »)
Site : `https://rpvdsuccess.com/` (vente) ou `https://rpvdsuccess.com/vote` (vote).
Paramètres d'URL : `src=meta&utm_source=facebook&utm_medium=paid&utm_campaign=bootcamp_ventes&utm_content={{ad.name}}&utm_term={{adset.name}}`
→ `src` est stocké sur chaque vote/billet (visible dans `/admin/bootcamp`).

## 5. Textes (prêts à publier — chiffres réels seulement)
Remplace `{N}` par les places restantes de l'admin ; `{sujet}` par le sujet sélectionné du jeudi. Pas de garantie de note, pas de faux témoignage.

### Parents (Facebook fil / Instagram fil) — CTA « S'inscrire » → `/`
1. **Texte** : Votre ado a un examen de maths ou de sciences cette semaine ? Dimanche, 1 h 30 en direct sur Zoom : on lui montre la démarche, étape par étape, sur le sujet qu'il a lui-même choisi. 20 $ tout inclus, remboursement complet jusqu'à samedi 23 h 59.
   **Titre** : Révision en direct, dimanche — 20 $ · **Description** : Remboursable jusqu'à samedi minuit
2. **Texte** : Un tuteur privé coûte 40-50 $ de l'heure. Ici : 1 h 30 en direct, sujet voté par les élèves, 20 $ tout inclus. Sec 1 à 5 — maths, sciences, chimie, physique, français.
   **Titre** : 1 h 30 de démarche pour 20 $
3. **Texte** : Pas de théorie en plus. On s'attaque aux pièges qui coûtent des points aux examens du ministère : factorisation, stœchiométrie, accord du participe passé… Dimanche, en direct. Il reste {N} places pour {sujet}.
   **Titre** : {sujet} — il reste {N} places
4. **Texte** : Le lien Zoom est personnel et arrive par courriel 30-60 minutes avant le cours. Caméra des élèves fermée, aucune donnée inutile demandée (juste un courriel). Réservation jusqu'à samedi 23 h 59.
   **Titre** : Sécuritaire, simple, 20 $

### Élèves (Reels / Stories) — CTA « Voter » → `/vote` (lun-mer) ou « S'inscrire » → `/` (jeu-sam)
Les élèves de 13-17 ans voient une pub qui les envoie voter ; l'achat se fait avec le parent (la page `/reserver` demande la case « 14 ans+ ou parent »).
1. **Texte** : Examen cette semaine ? Dis-nous le sujet qui te bloque. Dimanche, on le détruit en direct, étape par étape. Vote en 30 secondes. Commente CLUTCH et on t'envoie le lien.
   **Titre** : Choisis le sujet de dimanche
2. **Texte** : Zéro blabla. 1 h 30, la démarche exacte pour ton chapitre, 20 $. Demande à tes parents de réserver ta place.
   **Titre** : Clutch ton examen — dimanche
3. **Texte** : Le participe passé, c'est un arbre de décision : 3 questions et c'est réglé. Dimanche on le fait en direct.
   **Titre** : La démarche, pas la théorie

### Retargeting (fin de semaine)
**Texte** : Tu as regardé le Bootcamp de dimanche. Il reste {N} places, ventes fermées samedi 23 h 59, remboursable jusqu'au même moment. **Titre** : Dernière chance de réserver · CTA « S'inscrire ».

## 6. Format « GIF cliquable »
Meta ne diffuse pas de GIF natif en placement payant : utilise une **vidéo muette en boucle de 4-6 s** (MP4, 9:16 et 4:5) — le visuel est animé, **toute la publicité est cliquable** vers la page + bouton d'action. Voir `04-CREATIFS.md` pour le storyboard (barre « places » animée avec le **vrai** nombre).

## 7. Score / qualité (ce que Meta récompense)
- Un seul message par pub, accroche dans la 1ʳᵉ seconde et les 125 premiers caractères.
- Au moins **3 variantes créatives par ensemble** (Advantage+ creative activé, **améliorations musique/IA désactivées** pour garder le ton).
- Page d'atterrissage rapide (déjà : `/` charge en < 2 s) et cohérente avec la pub (prix 20 $ visible).
- Ne touche pas aux ensembles pendant 3-4 jours ; remplace les pubs à CTR < 0,8 % après 1 000 impressions.
- Répondre aux commentaires (automatisé : `03-COMMENTAIRE-VERS-DM.md`) augmente l'engagement.
- Qualité des événements : `Purchase` serveur avec courriel haché + `fbp/fbc` (déjà fait) → vise « Bonne » dans Gestionnaire d'événements.

## 8. Lecture des résultats (hebdomadaire)
Coût par achat (objectif ≤ 10 $ ; seuil de rentabilité sur le billet seul = 20 $ moins frais Stripe ≈ 19,12 $, mais la vraie valeur est l'entonnoir vers l'outil d'analyse) · taux vote→achat · `src=meta` dans `/admin/bootcamp`. Si coût par achat > 20 $ après 7 jours et ≥ 20 achats : couper le pire créatif, ne pas augmenter le budget.
