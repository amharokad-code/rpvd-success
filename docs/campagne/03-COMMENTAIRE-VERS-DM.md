# Automatisation « commentaire → message privé » (Instagram + Facebook)

Outil : ManyChat (ou BooSend, déjà connecté à tes outils). La configuration est identique ; seuls les noms de menus changent.

## Règles de plateforme à respecter (sinon Meta coupe l'accès)
- Un DM automatique n'est autorisé qu'**en réponse à une action de la personne** (commentaire, clic sur un bouton) — c'est exactement ce flux. Pas de DM à froid.
- Une seule réponse automatique par commentaire, pas de rafale ; délai 2-5 s (pas instantané).
- Toujours un moyen de **ne plus recevoir** de messages (« Réponds STOP »).
- Ne collecte rien dans le DM (ni nom, ni âge, ni téléphone). Le lien mène à `/vote`, où se trouvent le consentement et la case « 14 ans+ ou parent ».
- Les comptes de moins de 18 ans reçoivent le même message neutre (pas de ciblage par âge possible dans les DM).

## Déclencheur
Commentaire contenant un des mots (insensible à la casse, mot entier) : `VOTE`, `CLUTCH`, `EXAMEN`, `RPVD`
Portée : tous les posts/Reels **et** les publicités (activer « inclure les commentaires sur les pubs / dark posts »).

## Étape 1 — réponse publique (variante aléatoire parmi 3, évite le spam-flag)
- « Envoyé en message privé ⚡ Regarde tes DMs ! »
- « C'est parti, check tes messages 👀 »
- « Lien envoyé en privé ! Si tu ne vois rien, regarde « Demandes de messages ». »

## Étape 2 — DM (après 3 s)
> Salut ! 👋 Voici le lien pour voter le sujet que tu veux voir dimanche (30 secondes, juste ton courriel) :
> Les 4 sujets les plus votés passent en direct, 1 h 30, 20 $. Pour réserver, un parent ou toi si tu as 14 ans+.
> **[🗳️ Voter pour mon chapitre]** → `https://rpvdsuccess.com/vote?src=dm&utm_source=instagram&utm_medium=dm&utm_campaign=comment_to_dm`
> (Réponds STOP pour ne plus recevoir de messages.)

## Étape 3 — relance (une seule, 24 h après, **seulement si la personne n'a pas cliqué** et dans la fenêtre de 24 h autorisée)
> Dernier rappel : le vote ferme mercredi soir, les sujets sont annoncés jeudi 17 h 🎯 **[Voter maintenant]**

Puis fin de séquence. Aucune relance au-delà.

## Mots-clés STOP / aide
`STOP`, `ARRET`, `ARRÊT` → « C'est noté, plus aucun message. » + retrait de la liste. Message inconnu → « Je suis un robot 🤖 Pour une question : rpvdsuccess@gmail.com ».

## Mesure
Lien avec `src=dm` → les votes arrivent dans `/admin/bootcamp` avec leur source. Compte les clics du bouton dans l'outil d'automatisation.
