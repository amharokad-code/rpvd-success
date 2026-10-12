// Miroir navigateur de netlify/functions/_lib/engagement.js → planSuggere (mêmes règles, test de référence côté serveur).
// Compte à rebours : nombre de jours entiers jusqu'à la VRAIE date d'examen de l'école (jamais d'urgence inventée).
export function planLabel(day, ordres) {
  const when = day === 0 ? "Aujourd'hui" : `Jour ${day + 1}`
  return `${when} : segment${ordres.length > 1 ? 's' : ''} ${ordres.join(' et ')}`
}

export function examCountdown(daysToExam) {
  if (daysToExam === null || daysToExam === undefined) return null
  if (daysToExam < 0) return null
  if (daysToExam === 0) return "L'examen est aujourd'hui"
  return `Examen dans ${daysToExam} jour${daysToExam > 1 ? 's' : ''}`
}
