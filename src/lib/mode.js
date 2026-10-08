// Sélecteur de matière → mode du Moteur D.
//   calcul        : RPVD Visuel (maths, physique, chimie)
//   raisonnement  : D-R (sciences sans calcul, histoire, anglais)
export const MODE_BY_SUBJECT = {
  math: 'calcul',
  physique: 'calcul',
  chimie: 'calcul',
  sciences: 'raisonnement',
  histoire: 'raisonnement',
  anglais: 'raisonnement',
}

export const PICKER_SUBJECTS = ['math', 'physique', 'chimie', 'sciences', 'histoire', 'anglais']

export const modeForSubject = (subject) => MODE_BY_SUBJECT[subject] || 'calcul'
