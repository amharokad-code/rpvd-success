# Évaluation des facteurs relatifs à la vie privée (EFVP) — fournisseurs hors Québec

Loi 25, art. 17 : avant de communiquer des renseignements personnels à l'extérieur du Québec, évaluer la sensibilité des renseignements, la finalité, les protections contractuelles et le régime juridique de l'endroit. Version proportionnée à une petite entreprise, à relire et signer.

| Fournisseur | Renseignements transmis | Finalité | Sensibilité | Protections | Conclusion |
|---|---|---|---|---|---|
| Supabase (base de données) | Courriel, choix de vote, état des billets, compte de l'outil | Faire fonctionner le service | Faible | Chiffrement en transit et au repos, accès fermé au public (service seulement), contrat de traitement (DPA) disponible | Acceptable |
| Netlify (hébergement, fonctions) | Requêtes du site (transit) | Héberger le site | Faible | HTTPS, aucun stockage de données personnelles par RPVD chez Netlify (sauf formulaire légal-contact) | Acceptable |
| Stripe (paiement) | Courriel, données de carte saisies directement chez Stripe | Encaisser 20 $ | Moyenne (paiement) | Certifié PCI DSS niveau 1 ; RPVD ne voit jamais la carte ; on ne garde pas le nom | Acceptable |
| Resend (courriels) | Courriel, contenu du courriel | Envoyer confirmations, liens, annonces | Faible | HTTPS, DPA disponible ; contenu sans donnée sensible | Acceptable |
| Zoom (cours) | Courriel, nom affiché « Élève XXXX » | Lien personnel au cours | Faible (aucun nom, aucune vidéo) | Caméras coupées, pas d'enregistrement, chat privé désactivé, DPA disponible | Acceptable avec les réglages de `02-ZOOM-PROTECTION-ELEVES.md` |
| Google Gemini (outil d'analyse) | Photo d'exercice (sans nom) | Générer l'analyse | Faible à moyenne (une photo peut contenir un nom écrit) | Photo jamais stockée par RPVD ; conseil à l'élève de ne pas photographier son nom | Acceptable |

Régime juridique : principalement États-Unis. Risque résiduel (accès par des autorités étrangères) jugé faible vu la nature des renseignements (courriel, choix de sujet) et le minimum transmis.

Mesures continues : réévaluer à chaque nouveau fournisseur ou nouvelle donnée collectée ; ne jamais ajouter nom, âge, caméra ou enregistrement sans nouvelle évaluation.

Approuvé par : ______________________ (responsable de la protection des renseignements personnels)  Date : ____________
