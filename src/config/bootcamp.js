// Constantes d'affichage du Bootcamp RPVD. La vérité (prix facturé, places, dates) vient du
// serveur (netlify/functions/_lib/bootcamp.js) : ces valeurs servent uniquement aux textes.
export const BOOTCAMP = {
  price: '20 $',
  priceValue: 20, // valeur envoyée aux pixels (le serveur envoie le montant réellement payé)
  currency: 'CAD',
  productId: 'bootcamp-rpvd',
  productName: 'Bootcamp RPVD',
  duration: '1 h 30',
  capacity: 90, // billets vendus par salle (salle Zoom Pro de 100, marge de 10)
  slots: ['13 h', '15 h', '17 h', '19 h'],
  tutorAnchor: '40 $', // tutorat privé, à l'heure (ordre de grandeur, même ancrage que le paywall)
}
