# Courriels automatiques (aucun envoi manuel)

Tous partent seuls (Resend), aux couleurs de la marque, depuis `netlify/functions/_lib/email.js`. Il suffit que Resend soit configuré (voir `02-ZOOM-RESEND-STRIPE.md`).

| # | Courriel | Déclencheur | Contenu clé |
|---|---|---|---|
| 1 | Vote reçu ✅ | Envoi du formulaire | Sujet voté, annonce jeudi 17 h |
| 2 | Ton sujet a été SÉLECTIONNÉ 🎯 | Sélection (jeudi 17 h ou admin) | Fiche de la session, date limite samedi 23 h 59, bouton « Réserver ma place » |
| 3 | Pas ce dimanche pour ton sujet | Sélection | Les 4 sessions retenues, ouvertes à tous |
| 4 | Ta place est réservée ✅ | Paiement Stripe confirmé | Fiche, référence, règles de la classe, remboursement jusqu'à samedi, bouton « Gérer / annuler » |
| 5 | 🔴 Ton lien Zoom | T-60 min | Bouton « Rejoindre le cours », lien personnel (un appareil) |
| 6 | Remboursement confirmé | Annulation par l'élève | Montant, délai bancaire 5-10 jours |
| 7 | Session annulée, tu es remboursé | Annulation par l'admin | Remboursement intégral automatique |
| 8 | 🔓 N places libérées | Dimanche 8 h, seulement si de vrais désistements | Bouton « Prendre une place », non remboursable |
| 9 | Garde la démarche avec toi | Lundi 9 h | Passerelle vers l'outil d'analyse + revoter |

Pour modifier un texte : la fonction correspondante dans `email.js` (`bootcampSelectedEmail`, `bootcampTicketEmail`, etc.), puis pousser sur `main`.
