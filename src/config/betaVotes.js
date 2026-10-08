// Bêta fermée : UNE seule source des sondages. Modifiable sans toucher au reste du code.
//   type 'multi'  : plusieurs choix, jusqu'à `max`, + champ « autre » facultatif
//   type 'single' : un seul choix ; `exemple` = aperçu du format (affiché sous l'option)
// Le sondage « format » est une DONNÉE, pas une décision : le format actuel reste en place
// quel que soit le résultat.
export const BETA_POLLS = [
  {
    key: 'matieres',
    type: 'multi',
    max: 2,
    titre: 'Quelles matières tu veux en premier ?',
    options: [
      { id: 'histoire', label: 'Histoire' },
      { id: 'anglais', label: 'Anglais' },
      { id: 'biologie', label: 'Biologie' },
      { id: 'science-techno', label: 'Science et techno' },
      { id: 'francais', label: 'Français' },
      { id: 'maths-autres-niveaux', label: 'Maths d\u2019autres niveaux (primaire, cégep)' },
    ],
    autre: { max: 40, label: 'Autre matière (sans info perso)' },
  },
  {
    key: 'fonctionnalites',
    type: 'multi',
    max: 3,
    titre: 'Qu\u2019est-ce qui t\u2019aiderait le plus ?',
    options: [
      { id: 'clone', label: 'Un exercice pareil avec d\u2019autres chiffres pour m\u2019entraîner' },
      { id: 'indices', label: 'Des indices un à un avant de voir la réponse' },
      { id: 'pieges', label: 'Les pièges classiques de chaque type d\u2019exercice' },
      { id: 'vocal', label: 'Parler à l\u2019appli au lieu d\u2019écrire' },
      { id: 'simulation', label: 'Un examen chronométré pour m\u2019entraîner' },
      { id: 'veille', label: 'Un plan de révision la veille de l\u2019examen' },
      { id: 'tentative', label: 'Envoyer ma tentative pour voir où je me suis trompé' },
    ],
  },
  {
    key: 'format',
    type: 'single',
    titre: 'Quel format t\u2019aide le plus ?',
    options: [
      {
        id: 'visuel',
        label: 'Ligne par ligne',
        exemple: 'C\u2081\u00b7V\u2081 = C\u2082\u00b7V\u2082 (Conservation de la matière)\nV\u2081 = C\u2082\u00b7V\u2082 / C\u2081 (Isoler le volume initial)',
      },
      {
        id: 'paragraphe',
        label: 'Un paragraphe qui explique dans ma tête',
        exemple:
          'Tu écris la loi de conservation de la matière. Tu isoles V\u2081. Tu remplaces C\u2081, C\u2082 et V\u2082 par les valeurs de l\u2019énoncé. Donc, tu obtiens V\u2081 en mL. Tu choisis la pipette volumétrique et t\u2019as la réponse.',
      },
      { id: 'nsp', label: 'Je ne sais pas' },
    ],
  },
]

// Questions du micro-feedback après chaque fiche.
export const BETA_FEEDBACK_QUESTIONS = {
  niveau: {
    titre: 'Quel niveau t\u2019a débloqué ?',
    options: [
      { id: '1', label: 'Niveau 1' },
      { id: '2', label: 'Niveau 2' },
      { id: '3', label: 'Niveau 3' },
      { id: 'aucun', label: 'Aucun' },
    ],
  },
  refaire: {
    titre: 'Pourrais-tu refaire un exercice pareil seul ?',
    options: [
      { id: 'oui', label: 'Oui' },
      { id: 'presque', label: 'Presque' },
      { id: 'non', label: 'Non' },
    ],
  },
  commentaireMax: 140,
}
