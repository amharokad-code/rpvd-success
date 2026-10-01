# Académie RPVD — Système opérationnel

Doctrine : démarche > théorie. Chaque action alimente la PWA RPVD Success.
Landing : `/bootcamp` (page `src/pages/BootcampPage.jsx`, config hebdo `src/config/bootcamp.js`).

## Rythme hebdomadaire

| Jour | Action | Fichier à utiliser | Qui |
|---|---|---|---|
| Mar | Publier post « Vote & Clutch » + lien `/bootcamp` (phase `vote`) | `03-POSTS-SOCIAUX.md` | Humain (2 min) |
| Mer | Relance du vote (stories) | `03-POSTS-SOCIAUX.md` | Humain |
| Jeu matin | Exporter les votes (Netlify → Forms → bootcamp-vote → CSV), compter par chapitre, retenir 4-5 sujets | `02-FORMULAIRES-ET-CALENDLY.md` §3 | Humain (10 min) |
| Jeu soir | Créer 4 événements Calendly + liens Stripe, remplir `sessions` dans `src/config/bootcamp.js`, `phase: 'sales'`, push | `02-…` §1-2 | Humain (20 min) |
| Jeu soir → Sam | Courriel d'ouverture + posts de vente (honnêtes : places réelles) | `04-COURRIELS.md` E1 | Humain |
| Sam | Rappel J-1 avec lien Zoom | `04-COURRIELS.md` E2 | Humain |
| Dim | 4 blitz | `05-RUN-SHEET-SESSION.md` | Majid / Ismaël + employé |
| Lun | Courriel post-session + upsell Premium + PWA | `04-COURRIELS.md` E3-E4 | Humain |

## Checklist de lancement (one-shot)

Fait par l'agent : landing, formulaire de vote, route, scripts, courriels, posts, run-sheet.

À faire par un humain (nécessite compte/argent/identité) :
- [ ] Déployer (push `main`) puis vérifier `https://rpvdsuccess.netlify.app/bootcamp` et que le formulaire `bootcamp-vote` apparaît dans Netlify → Forms.
- [ ] Activer les notifications courriel Netlify Forms (Site settings → Forms → Notifications) vers l'adresse d'équipe.
- [ ] Créer le compte Zoom Pro et fixer la limite à 100 ; garder 10-15 places de marge.
- [ ] Créer les produits Stripe Payment Link : « Bootcamp Clutch – réservation anticipée 12 $ » et « – dernière minute 18-20 $ » (CAD, paiement unique). Si Stripe en mode live : valider avec le titulaire du compte.
- [ ] Créer Calendly (ou Cal.com) : modèle d'événement « Bootcamp Clutch » (135 min + 15 min tampon, capacité 85-90 invités, lien Zoom, question « niveau »).
- [ ] Configurer `RESEND_API_KEY` + `EMAIL_FROM` (domaine vérifié) sur Netlify — sinon aucun courriel automatique ne part.
- [ ] Tranchez : le flux Basic du FigJam mentionne « Mosquée / 0 $ ou 5 $ » alors que l'offre Clutch est 12-20 $. Décider si ce sont deux produits distincts.
- [ ] Mineurs : le paiement doit être fait par un parent/tuteur (déjà indiqué dans la FAQ de la landing) ; confirmer avec la politique E.M.A.
- [ ] Honnêteté : ne jamais afficher de compte à rebours/rareté fictive. Les places restantes ne se mentionnent que si le chiffre est réel.

## KPI (tableau à tenir chaque lundi)

| KPI | Calcul | Cible initiale |
|---|---|---|
| Votes / semaine | lignes `bootcamp-vote` | 150+ |
| Taux vote → achat | achats / votes | 15 % |
| Remplissage | participants / capacité | 40 → 85 |
| Revenu brut dimanche | Σ billets | 2 400 $ → 5 400 $ |
| Bootcamp → PWA | abonnements avec `src=bootcamp` / participants | 10 % |
| Upsell Premium | ventes / participants | 2-4 élèves |

Les visites `/bootcamp` et clics sont déjà comptés par `track-event` (page vue, `cta_click`, `checkout_started` avec `plan=bootcamp`).

## Projection (rappel)
Baseline 4 × 40 × 15 $ = 2 400 $ · Optimal 4 × 90 × 15 $ = 5 400 $ · Premium 4 × 350 $ = 1 400 $.
