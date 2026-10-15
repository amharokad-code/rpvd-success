# Visuel retenu : la story « Dimanche, 21 h » (9:16) + prompts de modification

## Pourquoi la story plutôt que l'affiche
- Un seul message clair (un parent qui demande « T'as étudié pour jeudi ? »), qui s'identifie en 2 secondes. L'affiche contient 3 produits, 4 atouts et 2 appels à l'action : trop dense sur un téléphone.
- Le format 9:16 sert partout : story Instagram/Facebook, Reel, TikTok, Snapchat, Shorts. L'affiche 4:5 ne sert qu'au fil Facebook/Instagram.
- La vidéo de 25 s est la même scène animée : l'image fixe sert de couverture et de story, la vidéo de Reel/TikTok. Un seul concept, cohérent.

## Corrections à faire (règles : aucune promesse de notes, prix de lancement affiché avec sa date, zones de sécurité des stories)
| Actuel | Nouveau |
|---|---|
| « Toi, tu respires. Ton jeune performe. » | « Toi, tu respires. Ton jeune sait quoi faire. » |
| « Toute la matière de l'examen » | « Un type d'examen, une démarche » |
| « Démo gratuite : écris « RPVD » » | « Dis-nous ton sujet : lien en bio » (la démo vidéo n'existe pas encore et le courriel exige un consentement) |
| Prix « 37 $ » sans date | « 37 $ » + petite ligne « Prix de lancement jusqu'au 31 décembre 2026 » (la date de fin affichée une seule fois, factuellement) |
| Logo et dernière ligne trop bas | Tout le contenu entre 250 px du haut et 270 px du bas |

## Prompt 1 : modifier l'image existante (à coller avec `story_jour1_logo.png` jointe)
```
Modifie cette image sans changer son style : garde le tableau noir vert, le cadre en bois, le dessin à la craie, les deux personnages (la mère à la porte et l'ado sur le lit), le calendrier « JEUDI : EXAMEN », l'horloge et les couleurs. Garde le format vertical 1080 x 1920.

Change SEULEMENT ces éléments de texte, en conservant la même écriture manuscrite à la craie :
1. Dans l'encadré, remplace la première ligne « Toute la matière de l'examen » par « Un type d'examen, une démarche ». Garde les deux autres lignes telles quelles.
2. Sur l'étiquette de prix, garde « 37 $ » et ajoute en dessous, en petits caractères à la craie blanche : « Prix de lancement jusqu'au 31 décembre 2026 ».
3. Remplace « Toi, tu respires. Ton jeune performe. » par « Toi, tu respires. Ton jeune sait quoi faire. »
4. Remplace « Démo gratuite : écris « RPVD » » par « Dis-nous ton sujet : lien en bio ».
5. Remonte le logo pyramide et la dernière ligne de texte pour que tout le contenu reste entre 250 px du haut et 270 px du bas de l'image (zones d'interface des stories). Le logo reste en bas à droite, mais plus haut.

Orthographe française exacte, accents inclus. N'ajoute aucun autre texte, aucun autre prix, aucune promesse de résultat.
```

## Prompt 2 : si la modification échoue, regénérer l'image entière
```
Image verticale 1080 x 1920, style tableau noir vert avec cadre en bois clair et dessins à la craie colorée (jaune, blanc, rose-corail, bleu clair), écriture manuscrite à la craie, très lisible sur un téléphone.

Composition, de haut en bas (marges de sécurité : rien dans les 250 px du haut ni dans les 270 px du bas) :
- Titre en jaune : « Dimanche, 21 h. » avec une petite horloge dessinée à droite.
- À gauche, une mère qui ouvre une porte, bulle corail : « T'as étudié pour jeudi ? ». Au centre, un calendrier : « JEUDI : EXAMEN » entouré en rouge.
- À droite, un ado allongé sur son lit avec son téléphone, bulle blanche : « Ouais... genre. ». Une flèche jaune descend vers l'encadré.
- Grand encadré à la craie blanche : titre jaune « Capsule examen » ; trois lignes avec pictogrammes : « Un type d'examen, une démarche » / « Une démarche par type de numéro » / « Sous-titrée, à revoir autant qu'il faut ». Étiquette de prix jaune « 37 $ » avec en petits caractères en dessous « Prix de lancement jusqu'au 31 décembre 2026 ».
- Ligne bleu clair : « Toi, tu respires. Ton jeune sait quoi faire. »
- Ligne corail soulignée : « Dis-nous ton sujet : lien en bio ».
- Petit logo pyramide (trois étages orange, blanc, gris) en bas à droite, au-dessus de la zone de sécurité.

Orthographe française exacte, accents inclus. Aucun autre texte, aucun autre prix, aucune promesse de résultat.
```

## Prompt 3 : la vidéo de 25 s (même texte à corriger dans l'animation)
```
Reprends l'animation de 25 secondes (format vertical 1080 x 1920, tableau noir vert, dessin à la craie qui se dessine étape par étape) avec les mêmes scènes. Changements de texte seulement :
- Dans l'encadré final : « Un type d'examen, une démarche » au lieu de « Toute la matière de l'examen ».
- Phrase finale : « Toi, tu respires. Ton jeune sait quoi faire. » au lieu de « Ton jeune performe. ».
- Dernière image : « 37 $ » avec « Prix de lancement jusqu'au 31 décembre 2026 », puis « Dis-nous ton sujet : lien en bio ». Aucune mention de « démo gratuite ».
- Garde les sous-titres (en français, bien lisibles) et la voix actuelle ; ajuste la narration finale pour dire « Ton jeune sait quoi faire ».
Tout le texte à l'écran reste entre 250 px du haut et 270 px du bas.
```

## Après les corrections
- Image : story du dimanche 18 (autocollant lien vers `rpvdsuccess.com/demande?src=ig_story`), et image fixe de couverture de la vidéo.
- Vidéo : Reel Instagram/Facebook, TikTok, Shorts, Spotlight (lien `?src=…` propre à chaque plateforme).
- Si 37 $ reste le prix après le 1er janvier : mettre à jour `src/config/pricing.mjs` et refaire l'image avec « 50 $ » (le site bascule tout seul).
