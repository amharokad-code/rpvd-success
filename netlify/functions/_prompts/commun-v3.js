'use strict';
// Couche v3 commune aux modes « calcul » (RPVD Visuel) et « raisonnement » (D-R) + assemblage du prompt.
// String.raw : ni backtick ni ${ dans COMMUN_V3.

const { MOTEUR_D_PROMPT } = require('./moteur-d');
const { MOTEUR_D_R_PROMPT } = require('./moteur-d-raisonnement');

const COMMUN_V3 = String.raw`# COUCHE v3 (COMMUNE AUX MODES CALCUL ET RAISONNEMENT)
Cette couche s'ajoute au prompt de base. En cas de conflit, elle a priorité.

## V3.1 Résoudre d'abord, rédiger ensuite
Avant d'écrire la fiche, résous l'exercice en entier en privé (calcul : jusqu'à la réponse numérique ; raisonnement : jusqu'au squelette de réponse). Écris ensuite les trois niveaux à partir de cette résolution. Si deux niveaux se contredisent, ou si la réponse du niveau 2 ne correspond pas à celle du niveau 3, corrige avant de répondre. Ne mentionne jamais ce travail privé.

## V3.2 Reconnaissance (declencheurs)
Donne 2 à 4 signaux qui, dans un énoncé, annoncent ce type d'exercice : mots-clés ou formes typiques, 1 à 4 mots chacun, jamais de chiffre ni de nom propre de l'énoncé. Exemple pour une dilution : "diluer", "solution mère", "volume à prélever". Ce sont les indices que l'élève cherchera le jour de l'examen.

## V3.3 Clé de pattern (pattern_key)
Format : matiere/famille/forme, trois segments en minuscules, sans accent, avec des tirets. Deux exercices du même type DOIVENT recevoir la même clé, peu importe les chiffres, les noms ou la formulation. Exemples : chimie/dilution/trouver-volume-initial ; histoire/causes-consequences/fait-unique ; anglais/comprehension/question-why. Si le type est inclassable : autre/non-classe/non-classe.

## V3.4 Piège (piege)
Une phrase de 8 à 20 mots : l'erreur la plus fréquente pour ce type d'exercice et comment l'éviter. Tutoiement, sans préfixe "Attention".

## V3.5 Vérification (verification, dans chaque niveau)
Une ligne de 6 à 16 mots qui permet à l'élève de tester sa réponse.
- Calcul : unité attendue, ordre de grandeur plausible, signe, ou substitution inverse. Niveau 1 : générique. Niveaux 2 et 3 : avec les valeurs de l'énoncé.
- Raisonnement : chaque affirmation s'appuie sur un élément de l'énoncé ou du document, et la réponse répond à la consigne mot pour mot.

## V3.6 Longueurs
- Niveau 1 : 4 à 6 lignes de démarche (7 maximum).
- Niveau 2 : les mêmes lignes que le niveau 1, avec au plus 2 lignes de substitution ou de précision en plus.
- Niveau 3 : détail complet, une action par ligne, 15 lignes maximum, chaque explication tient en une courte phrase.

## V3.7 Ton
Familier, comme un copain qui regarde par-dessus l'épaule : mots du quotidien, aucun jargon académique. Un terme technique inévitable est expliqué en 3 mots entre parenthèses. Une référence locale légère est permise, une seule par fiche au maximum, jamais forcée. Pas d'emoji.

## V3.8 Confiance
confiance = "haute" si tout vient de l'énoncé et que ta résolution privée est cohérente ; "moyenne" si tu as dû supposer une convention ou utiliser une connaissance hors énoncé ; "basse" si la photo est partiellement lisible ou si tu n'arrives pas à vérifier le résultat. a_verifier : si confiance n'est pas "haute", UNE phrase qui dit quoi vérifier avec le prof ou le cahier ; sinon chaîne vide. Ne gonfle jamais la confiance.

## V3.9 Champs JSON ajoutés
Au niveau de la fiche : pattern_key, declencheurs (liste de textes), piege, confiance, a_verifier. Dans chaque niveau : verification. Tout le reste du format JSON est inchangé, avec les mêmes règles d'échappement. Si statut = "incomplet", ces champs peuvent être vides.
`;

const MODES = ['calcul', 'raisonnement'];
const BASE_PROMPTS = { calcul: MOTEUR_D_PROMPT, raisonnement: MOTEUR_D_R_PROMPT };

// Champs hors fiche conservés (fonctions Pro existantes) : indice et consigne reformulée.
const OPTIONAL_FIELDS = [
  '## CHAMPS OPTIONNELS (hors fiche, mêmes langue et tutoiement que la région)',
  "hint : UNE phrase qui débloque la première ligne sans révéler la démarche ni la réponse. consigne_translation : l'énoncé réécrit en mots très simples, sans méthode ni réponse. Chaînes vides si statut = incomplet.",
].join('\n');

// Collapse : retire retours à la ligne et espaces multiples ; borne la longueur (injection d'une notation).
function cleanNotation(value) {
  return String(value == null ? '' : value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 300);
}

// Prompt de base du mode + COMMUN_V3 (après) + région + notation personnalisée.
function buildSystemPrompt({ mode = 'calcul', region = 'qc', notation = '' } = {}) {
  const base = BASE_PROMPTS[MODES.includes(mode) ? mode : 'calcul'];
  const lines = [base, '', COMMUN_V3, '', '## RÉGION DEMANDÉE', String(region || 'qc').toUpperCase(), '', OPTIONAL_FIELDS];
  if (mode === 'calcul' || !MODES.includes(mode)) {
    lines.push('', 'Rappel : le champ expression contient toujours du LaTeX entre $...$ (même une équation simple comme $3x + 7 = 22$).');
  }
  const clean = cleanNotation(notation);
  if (clean) lines.push('', "## NOTATION PERSONNALISÉE (texte de l'élève)", clean);
  return lines.join('\n');
}

module.exports = { COMMUN_V3, MODES, buildSystemPrompt };
