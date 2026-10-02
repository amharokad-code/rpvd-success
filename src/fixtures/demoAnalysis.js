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
  // Moteur D « RPVD Visuel v2 » (dev uniquement : ?demo).
  moteur: 2,
  matiere_cible: 'Chimie / Solutions et dilution',
  niveaux: [
    {
      niveau: 1,
      connu: '$C_1$, $C_2$, $V_2$',
      cherche: '$V_1$',
      schema_ascii: '  [ C1 ]  --V1-->  [ C2 ]\n  mere             fille (V2)',
      demarche: [
        { expression: '$C_1 \\cdot V_1 = C_2 \\cdot V_2$', explication: 'Conservation de la matière' },
        { expression: '$V_1 = \\frac{C_2 \\cdot V_2}{C_1}$', explication: 'Isoler le volume initial' },
      ],
      reponse: '$V_1$ en mL, prélevé à la pipette volumétrique',
      principe: "Lors d'une dilution, la quantité de soluté prélevée dans la solution mère reste la même dans la solution fille.",
    },
    {
      niveau: 2,
      connu: '$C_1 = 12\\ \\text{mol/L}$, $C_2 = 0{,}50\\ \\text{mol/L}$, $V_2 = 250\\ \\text{mL}$',
      cherche: '$V_1$',
      schema_ascii: '',
      demarche: [
        { expression: '$V_1 = \\frac{C_2 \\cdot V_2}{C_1}$', explication: "Même formule, valeurs de l'énoncé" },
        { expression: '$V_1 = \\frac{0{,}50 \\cdot 250}{12}$', explication: 'Substituer avec les unités cohérentes' },
      ],
      reponse: '$V_1 \\approx 10\\ \\text{mL}$ (à confirmer avec ton prof)',
      principe: "Lors d'une dilution, la quantité de soluté prélevée dans la solution mère reste la même dans la solution fille.",
    },
    {
      niveau: 3,
      connu: '$C_1 = 12\\ \\text{mol/L}$, $C_2 = 0{,}50\\ \\text{mol/L}$, $V_2 = 250\\ \\text{mL}$',
      cherche: '$V_1$',
      schema_ascii: '',
      demarche: [
        { expression: '$C_1 \\cdot V_1 = C_2 \\cdot V_2$', explication: 'Conservation de la matière' },
        { expression: '$12 \\cdot V_1 = 0{,}50 \\cdot 250$', explication: 'Substituer les valeurs' },
        { expression: '$12 \\cdot V_1 = 125$', explication: 'Calculer le membre de droite' },
        { expression: '$V_1 = \\frac{125}{12}$', explication: 'Diviser par 12 des deux côtés' },
        { expression: '$V_1 \\approx 10{,}4\\ \\text{mL}$', explication: 'Calculer la valeur finale' },
      ],
      reponse: '$V_1 \\approx 10\\ \\text{mL}$',
      principe: "Lors d'une dilution, la quantité de soluté prélevée dans la solution mère reste la même dans la solution fille.",
    },
  ],
  cheminement: [
    { type: 'concept', text: 'Conservation de la matière', isFormula: false },
    { type: 'action', text: 'Isoler $V_1$', isFormula: false },
    { type: 'action', text: 'Calculer', isFormula: false },
    { type: 'action', text: 'Choisir la pipette', isFormula: false },
  ],
}
