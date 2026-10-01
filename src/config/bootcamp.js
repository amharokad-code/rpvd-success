// Configuration de l'Académie RPVD (Bootcamps Clutch). Seul fichier à éditer chaque semaine :
// remplir `sessions` après la sélection du jeudi (liens Calendly/Stripe créés à la main),
// puis redéployer. Une session sans `url` s'affiche « Bientôt » (aucun faux lien).
export const BOOTCAMP = {
  currency: 'CAD',
  earlyPrice: 12,
  lastMinutePriceMin: 18,
  lastMinutePriceMax: 20,
  durationLabel: '2 h 15',
  roomCap: 100, // plafond réel Zoom Pro
  premiumPriceMin: 300,
  premiumPriceMax: 450,
  // Statut de la semaine : 'vote' (mar-mer) | 'sales' (jeu soir-sam) | 'live' (dimanche) | 'closed'
  phase: 'vote',
  sessions: [
    // { title: 'Fractions SN4', level: 'Sec 4', time: 'Dimanche 14 h', url: 'https://calendly.com/...' },
  ],
  premiumUrl: '', // lien Calendly d'appel de qualification Premium (sinon mailto)
}
