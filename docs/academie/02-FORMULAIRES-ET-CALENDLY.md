# Formulaires, réservation, paiement

## 1. Événement Calendly « Bootcamp Clutch » (copier-coller)

- **Nom** : Bootcamp Clutch RPVD — {Sujet} ({Niveau})
- **Durée** : 135 min (+15 min tampon après)
- **Lieu** : Zoom (lien généré automatiquement)
- **Invités max** : 85-90 (jamais 100 : marge pour l'équipe)
- **Description** :
  > Blitz en direct de 2 h 15 : on maîtrise la démarche du chapitre, étape par étape, sur les exercices-pièges d'examen. Zéro théorie. Prépare : feuille, crayon, ton dernier examen/devoir. Si tu as moins de 18 ans, la réservation doit être faite par un parent/tuteur.
- **Questions** : Niveau (Sec 1-5) · Ton plus gros blocage dans ce chapitre (texte court) · Courriel du parent (si mineur)
- **Confirmation** : rediriger vers `https://rpvdsuccess.netlify.app/bootcamp?merci=1`
- **Paiement** : Calendly → Stripe (ou Payment Link Stripe placé avant la réservation) : 12 $ anticipé / 18-20 $ dernière minute (CAD).

## 2. Après création : activer sur la landing

Éditer `src/config/bootcamp.js` :
```js
phase: 'sales',
sessions: [
  { title: 'Fractions', level: 'Sec 4', time: 'Dimanche 14 h', url: 'https://calendly.com/…' },
  { title: 'Équations', level: 'Sec 3', time: 'Dimanche 16 h', url: 'https://calendly.com/…' },
  { title: '…', level: '…', time: 'Dimanche 18 h 30', url: '…' },
  { title: '…', level: '…', time: 'Dimanche 20 h 30', url: '…' },
],
```
Puis `git push` (déploiement auto). Après le dimanche : `phase: 'vote'` et `sessions: []`.

## 3. Dépouillement du vote (jeudi matin, 10 min)

1. Netlify → Forms → `bootcamp-vote` → Export CSV.
2. Tableur : colonne `topic` normalisée en minuscules → tableau croisé par (`level`, `subject`, `topic`).
3. Retenir les 4-5 premiers ; en cas d'égalité, privilégier celui dont les examens tombent le plus tôt (colonne `exams`).
4. Garder la liste des courriels de votants pour le courriel d'ouverture (E1).

## 4. Google Form alternatif (si on préfère à Netlify)

Titre : « Vote & Clutch ». Champs : Courriel (obligatoire) · Niveau (liste Sec 1-5) · Matière (Maths/Sciences/Physique/Chimie) · Chapitre à détruire (court) · Tes examens cette semaine (court, optionnel). Message de fin : « Vote reçu. On t'écrit dès que les sessions de dimanche sont ouvertes. »

## 5. Formulaire Premium (qualification, 2 min)

Nom de l'élève · Niveau · Domaine voulu (Arithmétique, Algèbre SN4, autre) · Prochaine date d'examen · Disponibilités du week-end · Courriel parent. Réponse sous 24 h avec un appel de 10 min.
