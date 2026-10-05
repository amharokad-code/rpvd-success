# Snapchat Ads — campagne « Bootcamp RPVD »

Les noms de boutons de Snap Ads Manager changent souvent : si un libellé diffère, prends l'équivalent le plus proche (je ne peux pas ouvrir l'interface d'ici).

## 1. Prérequis (toi)
Compte Snap Ads Manager (ads.snapchat.com), **vérification d'identité/entreprise**, carte bancaire, profil public de marque (nom : Bootcamp RPVD, lien `rpvdsuccess.com`).
Snap Pixel : Events Manager → créer le pixel → coller le script dans `index.html` **derrière le même consentement marketing** que Meta (demande-moi de l'ajouter avec l'ID du pixel ; sans pixel, Snap ne peut pas optimiser les achats, seulement les clics).

## 2. Campagne
- **Objectif : Ventes / Conversions sur le site** (Website Conversions → événement *Purchase*). Tant que le pixel Snap n'a pas ~30 achats : démarrer en **Traffic (Swipe Up)** vers `/vote`, puis basculer.
- Budget : **20 $ CAD/jour**. Durée : continue, lundi → samedi.
- Ensemble : Québec, langue **français**, **13-17 ans = âge + lieu seulement** (les intérêts sont limités pour les mineurs ; ne pas s'appuyer dessus) ; second ensemble **parents 35-54 ans** (peu de volume sur Snap : surtout du test).
- Placements : Snap Ads (Top Snap) en vidéo verticale 9:16, 5-10 s. Option « Automatic Placement » ok.
- Bouton : « Voir plus » / « S'inscrire » (Snap n'a plus de « Swipe up » littéral selon les formats).
- URL : `https://rpvdsuccess.com/vote?src=snap&utm_source=snapchat&utm_medium=paid&utm_campaign=bootcamp_ventes&utm_content=<nom_créatif>`

## 3. Créatifs et voix
Même règle que Meta : **vrai** nombre de places, aucune garantie de note.
1. **Snap A (6 s)** — Plan fixe sur un cahier avec un problème de maths, stylo qui annote en jaune. Texte à l'écran : « Examen cette semaine ? » → « Dimanche : on le détruit en direct » → « 20 $ · 1 h 30 ». Voix off (ElevenLabs/voix réelle) : « Examen cette semaine ? Dimanche, on te montre la démarche en direct. Vote ton sujet. »
2. **Snap B (8 s)** — Écran de téléphone qui ouvre `/vote`, 3 taps (niveau, matière, sujet). Texte : « Vote en 30 secondes ». Voix : « Choisis ton chapitre. Les 4 plus votés passent dimanche. »
3. **Snap C (parents, 8 s)** — « Un tuteur : 40 $ de l'heure. Ici : 1 h 30 en direct pour 20 $. Lien Zoom personnel. Remboursable jusqu'à samedi. »
Légende (≤ 34 caractères) : « Bootcamp RPVD — dimanche, 20 $ » ; nom de marque : Bootcamp RPVD.

## 4. Lens interactive de vote (phase 2)
Une Lens (Lens Studio) demande un développement séparé ; à envisager seulement quand l'achat par pub est rentable. Pas nécessaire au lancement.

## 5. Lecture des résultats
Même grille que Meta (`01-META-ADS.md` §8). Coupe Snapchat si, après 7 jours et 150 $ dépensés, il n'y a aucun vote ou billet attribué à `src=snap`.
