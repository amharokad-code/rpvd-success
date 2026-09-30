// Analyse de démonstration (mode `?demo` en dev, contrat §0 et §5).
// Objet `Analysis` complet conforme au §1, ton FR-QC : équation 3x + 7 = 22.

const TEMPLATE = 'Pour trouver {{0}}, on isole {{1}} : on enlève {{2}} de chaque bord, pis on divise par {{3}}.'

const SLOTS = [
  { generic: "l'inconnue", value: 'x' },
  { generic: "l'inconnue", value: 'x' },
  { generic: 'le nombre ajouté', value: '7' },
  { generic: 'le coefficient', value: '3' },
]

// Même rendu que `renderTemplate` côté serveur : level_1 = génériques, level_2 = valeurs.
function render(template, slots, mode) {
  return template.replace(/\{\{(\d+)\}\}/g, (_, i) => slots[Number(i)]?.[mode] ?? '')
}

export const DEMO_ANALYSIS = {
  problem_type: 'Équation du premier degré',
  subject_guess: 'math',
  template: TEMPLATE,
  slots: SLOTS,
  level_1: render(TEMPLATE, SLOTS, 'generic'),
  level_2: render(TEMPLATE, SLOTS, 'value'),
  level_3_steps: [
    {
      title: 'On check ce qui colle à x',
      text: "Y'a un 7 qui traîne à côté du 3x. Pour trouver x, faut d'abord se débarrasser de lui.",
    },
    {
      title: 'On enlève 7 des deux bords',
      text: '3x + 7 − 7 = 22 − 7, ça donne 3x = 15. Ce que tu fais à gauche, tu le fais à droite, sinon ça balance pas.',
    },
    {
      title: 'On divise par 3',
      text: "3x ÷ 3 = 15 ÷ 3, donc x = 5. Tu peux checker : 3 × 5 + 7 = 22. C'est good !",
    },
  ],
  final_answer: 'x = 5',
  connu: ['3x', '7', '22'],
  cherche: 'x',
  demarche:
    "Tu regardes ce qui traîne à côté du 3x. Tu enlèves 7 des deux bords de l'équation. Tu écris 3x = 15. Tu divises les deux bords par 3. Tu vérifies en remplaçant x par 5 dans l'équation de départ, et t'as la réponse.",
  principe:
    "L'idée, c'est de garder l'équation balancée : tout ce que tu fais d'un côté du =, tu dois le faire de l'autre. Le but est d'isoler x tout seul pour connaître sa valeur.",
  hint: 'Regarde le 7 qui traîne à côté du 3x — faut le faire disparaître en premier.',
  pitfall: "Le piège classique : oublier de faire la même opération des deux côtés du signe égal.",
  consigne_translation: 'On te demande de trouver la valeur cachée derrière le x pour que l’équation soit vraie.',
  cheminement: [
    { type: 'concept', text: "l'inconnue", isFormula: false },
    { type: 'action', text: 'on enlève 7', isFormula: false },
    { type: 'action', text: '3x = 15', isFormula: true },
    { type: 'action', text: 'x = 5', isFormula: true },
  ],
}
