// Sujets du formulaire « Vote & Clutch », en cascade : niveau → matière → sujet.
// Périmètre officiel du Bootcamp : uniquement les matières où la DÉMARCHE se décompose
// (maths, science ST/STE, chimie, physique, français « algorithmique »). Pas d'histoire,
// de géographie ni d'éthique. « Autre sujet » ouvre un champ libre.
// Les noms de matières doivent rester identiques à SUBJECTS dans netlify/functions/_lib/bootcamp.js.
export const OTHER_TOPIC = 'Autre sujet'
export const LEVELS = ['Sec 1', 'Sec 2', 'Sec 3', 'Sec 4', 'Sec 5']

const MATH = {
  1: ['Fractions et opérations', 'Nombres décimaux et pourcentages', 'Nombres entiers et priorité des opérations', 'Expressions algébriques et équations simples', 'Périmètre et aire', 'Statistiques et probabilités'],
  2: ['Rapports, taux et proportions', 'Expressions algébriques (réduction, distributivité)', 'Équations du 1er degré', 'Aire et volume des solides', 'Transformations et figures semblables', 'Probabilités'],
  3: ['Polynômes et factorisation', 'Fonctions et taux de variation', 'Inéquations du 1er degré', "Systèmes d'équations", 'Théorème de Pythagore', 'Volume des solides', 'Statistiques et probabilités'],
}

const CST = {
  4: ['Fonctions (affine, quadratique, exponentielle, périodique, en escalier)', "Systèmes d'équations", 'Statistiques à deux variables (régression, corrélation)', 'Géométrie analytique (distance, pente, point milieu)', 'Trigonométrie (loi des sinus, aire de triangles)', 'Probabilités et mathématiques financières'],
  5: ['Optimisation (programmation linéaire)', 'Théorie des graphes', 'Probabilités conditionnelles et espérance', 'Procédures de vote', 'Figures équivalentes'],
}

const TS_SN = {
  4: ['Fonction quadratique (forme canonique, zéros)', 'Factorisation et équations du 2e degré', "Systèmes d'équations et d'inéquations", 'Géométrie analytique', 'Trigonométrie (lois des sinus et cosinus)', 'Statistiques à deux variables', 'Figures isométriques et semblables (preuves)'],
  5: ['Optimisation (programmation linéaire)', 'Fonctions (valeur absolue, racine, rationnelle)', 'Exponentielles et logarithmes', 'Trigonométrie (cercle trigonométrique, fonctions, identités)', 'Vecteurs', 'Coniques (cercle, ellipse, hyperbole, parabole)'],
}

const SCIENCE_4 = ["Balancement d'équations chimiques", 'Stœchiométrie', 'Concentration et dilution', "Circuits électriques (loi d'Ohm, puissance)", 'Ions, pH et électrolytes', "Transformations de l'énergie", 'Magnétisme et électromagnétisme (STE)']
const CHIMIE_5 = ['Gaz parfaits (PV = nRT)', 'Équilibre chimique (Kc, Le Chatelier)', 'pH, acides et bases', 'Molarité et stœchiométrie', 'Vitesse de réaction', 'Énergie des réactions (enthalpie)']
const PHYSIQUE_5 = ['Cinématique (MRU, MRUA)', 'Dynamique (F = ma, plan incliné)', 'Optique (réflexion, réfraction, lentilles)', 'Énergie et travail', 'Vecteurs et projectiles']

function francais(n) {
  const base = [
    'Accord du participe passé (arbre de décision)',
    'Accords dans le GN et sujet-verbe',
    'Manipulations syntaxiques (remplacement, déplacement, effacement, dédoublement)',
    'Lecture : justifier une réponse (Affirmation + Preuve + Explication)',
    'Écriture : gabarit du texte explicatif',
    'Écriture : gabarit du texte justificatif',
  ]
  if (n >= 4) base.push(n === 5 ? 'Écriture : texte argumentatif (épreuve ministérielle)' : 'Écriture : texte argumentatif')
  return base
}

// Matières offertes pour un niveau donné : tableau de [nom, sujets].
export function subjectsFor(level) {
  const n = Number(String(level).replace(/\D/g, ''))
  if (!n) return []
  if (n <= 3) return [['Mathématiques', MATH[n]], ['Français', francais(n)]]
  const out = [
    ['Maths CST', CST[n]],
    ['Maths TS', TS_SN[n]],
    ['Maths SN', TS_SN[n]],
  ]
  if (n === 4) out.push(['Science (ST / STE)', SCIENCE_4])
  if (n === 5) out.push(['Chimie', CHIMIE_5], ['Physique', PHYSIQUE_5])
  out.push(['Français', francais(n)])
  return out
}

export function topicsFor(level, subject) {
  const found = subjectsFor(level).find(([name]) => name === subject)
  return found ? [...found[1], OTHER_TOPIC] : []
}

// Vitrine des matières (page Bootcamp).
export const SUBJECT_SHOWCASE = [
  { name: 'Mathématiques', range: 'Sec 1 à 5 · CST, TS, SN', detail: 'Fonctions, géométrie, optimisation, résolution de problèmes : la démarche logique, pas les formules par cœur.' },
  { name: 'Science ST / STE', range: 'Sec 4', detail: "Balancement d'équations, stœchiométrie, circuits électriques, concentration." },
  { name: 'Chimie', range: 'Sec 5', detail: 'Gaz parfaits, équilibre Kc, pH, molarité.' },
  { name: 'Physique', range: 'Sec 5', detail: 'Cinématique, dynamique (F = ma), optique, énergie.' },
  { name: 'Français', range: 'Sec 1 à 5', detail: 'Arbres de décision pour les accords, formule de justification en lecture, gabarits de rédaction.' },
]
