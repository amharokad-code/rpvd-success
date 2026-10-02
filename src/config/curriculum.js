// Sujets proposés dans le formulaire « Vote & Clutch », en cascade : niveau → matière → sujet.
// Sciences pures seulement (pas de langues). Liste volontairement générique (ne prétend pas
// refléter à la lettre chaque variante de programme) ; « Autre sujet » ouvre un champ libre.
// Pour ajouter un sujet : ajouter une chaîne dans le bon tableau, rien d'autre à toucher.
export const OTHER_TOPIC = 'Autre sujet'

const MATH = {
  1: ['Nombres entiers et opérations', 'Fractions', 'Nombres décimaux et pourcentages', 'Expressions algébriques simples', 'Équations du 1er degré', 'Périmètre, aire et volume', 'Statistiques et probabilités'],
  2: ['Fractions et proportions', 'Rapports, taux et pourcentages', 'Expressions algébriques', 'Équations et inéquations du 1er degré', 'Relations et fonctions affines', 'Aires et volumes', 'Probabilités et statistiques'],
  3: ['Polynômes et factorisation', 'Fonction affine et fonction polynomiale', 'Systèmes d\'équations', 'Théorème de Pythagore et trigonométrie', 'Solides et géométrie', 'Statistiques'],
  4: ['Fonctions (affine, quadratique, exponentielle)', 'Équations du 2e degré', 'Systèmes d\'équations et d\'inéquations', 'Géométrie analytique', 'Trigonométrie', 'Probabilités et statistiques', 'Optimisation'],
  5: ['Fonctions (racine, exponentielle, logarithme, trigonométriques)', 'Équations et logarithmes', 'Vecteurs', 'Géométrie analytique et coniques', 'Optimisation', 'Probabilités et statistiques'],
}

const SCIENCE = {
  1: ['La cellule et le vivant', 'Propriétés de la matière', 'La Terre et l\'espace', 'Machines simples et forces', 'Méthode scientifique'],
  2: ['Mélanges et solutions', 'Reproduction et vivant', 'Géologie et phénomènes naturels', 'Systèmes technologiques', 'Méthode scientifique'],
  3: ['Transformations chimiques', 'Électricité', 'Ondes et lumière', 'Systèmes vivants du corps humain', 'Univers technologique'],
  4: ['Forces et mouvement', 'Électricité et magnétisme', 'Chimie des solutions et réactions', 'Transformation de l\'énergie', 'Vivant et environnement'],
  5: ['Forces et mouvement', 'Énergie et transformations', 'Chimie : réactions et équilibre', 'Électricité et magnétisme'],
}

const PHYSIQUE = {
  4: ['Mouvement et forces', 'Énergie et travail', 'Optique', 'Électricité'],
  5: ['Cinématique', 'Dynamique (lois de Newton)', 'Énergie et travail', 'Optique', 'Électricité et magnétisme'],
}

const CHIMIE = {
  4: ['Équations chimiques et stœchiométrie', 'Solutions et concentration', 'Gaz', 'Acides et bases'],
  5: ['Stœchiométrie', 'Gaz', 'Équilibre chimique', 'Acides et bases', 'Oxydoréduction'],
}

export const LEVELS = ['Sec 1', 'Sec 2', 'Sec 3', 'Sec 4', 'Sec 5']

// Matières offertes pour un niveau donné (tableau de [libellé, sujets]).
export function subjectsFor(level) {
  const n = Number(String(level).replace(/\D/g, ''))
  if (!n) return []
  const out = [
    ['Mathématiques', MATH[n]],
    ['Sciences', SCIENCE[n]],
  ]
  if (PHYSIQUE[n]) out.push(['Physique', PHYSIQUE[n]])
  if (CHIMIE[n]) out.push(['Chimie', CHIMIE[n]])
  return out.filter(([, topics]) => topics && topics.length)
}

export function topicsFor(level, subject) {
  const found = subjectsFor(level).find(([name]) => name === subject)
  return found ? [...found[1], OTHER_TOPIC] : []
}
