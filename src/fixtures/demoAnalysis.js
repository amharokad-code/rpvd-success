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
}
