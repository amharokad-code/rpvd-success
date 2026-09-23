'use strict';
// Analyse d'un devoir (image ou PDF) via l'API REST Gemini, sans SDK.
// Produit l'objet `Analysis` du contrat §1 : template + slots rendus côté serveur.

const { HttpError } = require('./http');

// gemini-1.5/2.0/2.5-flash sont retirés pour cette clé (404 « no longer available to new
// users », malgré /v1beta/models qui les liste encore). Et gemini-3.6/3.7/3.5-flash + flash-latest
// (essayés ensuite) sont des modèles trop récents/« preview » : vus en prod ET en test direct
// répondant 503 « high demand » de façon quasi systématique, avec des latences de 7 à 30s même
// quand ils finissent par répondre — instables au point de faire échouer TOUTE la chaîne de repli
// en même temps (les 4 à la fois, un soir de test réel). gemini-3.1-flash-lite est un modèle
// « lite » établi, moins demandé : 6/6 succès sur deux séries de tests avec le payload réel
// (vision + schéma JSON complet), 1-3.5s à chaque fois. Nouveau modèle principal.
// Chaîne 100% « lite » — plus aucun membre de la famille flash-3.x/3.6/3.7 instable, y compris
// en dernier repli (gemini-3.5-flash a été retiré : même famille surchargée que la primaire
// d'avant, ça n'aurait fait que reproduire le même problème une fois les 2 premiers replis épuisés).
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const MODEL_CHAIN = [GEMINI_MODEL, 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite-preview'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// 12s par modèle (pas 25s) : vu en prod, un essai qui traîne jusqu'à ~25.8s au total flirtait
// avec la limite d'exécution de la plateforme Netlify elle-même (le process se ferait tuer AVANT
// notre propre AbortController). À 12s/modèle, deux essais (principal + repli) tiennent sous 26s.
const TIMEOUT_MS = 12000;
const SUBJECTS = ['math', 'chimie', 'physique', 'sciences', 'francais', 'anglais', 'autre'];
const MIN_STEPS = 2;
// Plafond relevé (contrat) : un exercice complexe doit pouvoir produire une décomposition
// aussi longue que nécessaire plutôt que d'être artificiellement coupée à 7 étapes — l'UI
// (AnalysisEngine/ArbreCheminement) scrolle désormais au lieu de déborder.
const MAX_STEPS = 14;
const MAX_NOTATION_CHARS = 300;

// Index du premier modèle qui a répondu (mémorisé le temps de vie du conteneur).
let activeModelIndex = 0;

// Schéma de réponse imposé à Gemini (JSON structuré).
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    problem_type: { type: 'STRING', description: 'Nom court du type de problème, en français.' },
    subject_guess: { type: 'STRING', format: 'enum', enum: SUBJECTS },
    template: {
      type: 'STRING',
      description: 'Méthode générale en 1-2 phrases avec des trous {{0}}, {{1}}, ... (0-indexés).',
    },
    slots: {
      type: 'ARRAY',
      description: 'slots[i] correspond au trou {{i}}.',
      items: {
        type: 'OBJECT',
        properties: {
          generic: { type: 'STRING', description: "Rôle générique avec article, ex. « l'inconnue »." },
          value: { type: 'STRING', description: "Valeur concrète tirée de l'exercice, ex. « 7 »." },
        },
        required: ['generic', 'value'],
      },
    },
    level_1_fallback: { type: 'STRING', description: 'Template rendu avec les generic.' },
    level_2_fallback: { type: 'STRING', description: 'Template rendu avec les value.' },
    ocr_fail: {
      type: 'BOOLEAN',
      description: 'true si la photo est floue/illisible/vide ou ne montre pas un exercice — indépendant de la langue de réponse.',
    },
    level_3_steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          text: { type: 'STRING' },
        },
        required: ['title', 'text'],
      },
    },
    final_answer: { type: 'STRING' },
    hint: {
      type: 'STRING',
      description: "Une SEULE phrase qui débloque la première étape sans jamais donner la réponse ni la démarche complète.",
    },
    pitfall: {
      type: 'STRING',
      description: "L'erreur la plus commune sur ce type d'exercice, en 1-2 phrases concrètes.",
    },
    consigne_translation: {
      type: 'STRING',
      description: "L'énoncé réécrit en mots très simples pour un élève qui a du mal à comprendre ce qu'on lui demande — pas la solution, juste la consigne clarifiée.",
    },
    cheminement: {
      type: 'ARRAY',
      description:
        "Extraction du niveau 1 (« template ») en séquence linéaire d'étapes pour l'Arbre de Cheminement — PAS une nouvelle génération pédagogique, juste un parsing typé du même contenu.",
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', format: 'enum', enum: ['concept', 'action'] },
          text: { type: 'STRING', description: 'Mot-clé ou formule courte, extrait du template.' },
          isFormula: { type: 'BOOLEAN' },
        },
        required: ['type', 'text', 'isFormula'],
      },
    },
  },
  required: [
    'problem_type',
    'subject_guess',
    'template',
    'slots',
    'level_1_fallback',
    'level_2_fallback',
    'level_3_steps',
    'final_answer',
    'ocr_fail',
    'hint',
    'pitfall',
    'consigne_translation',
    'cheminement',
  ],
};

// Style de langue et jargon selon la région (contrat §3 — quadri-langue).
// `lang` pilote la langue de sortie du JSON ; `style` est l'instruction de ton/vocabulaire.
const REGION_STYLE = {
  qc: {
    lang: 'français',
    style:
      "Tu parles en français québécois, comme un grand frère ou une grande sœur cool : tutoiement, expressions comme « check », « c'est ben correct », « mon ami », « ben », « genre », et une référence occasionnelle au hockey si ça tombe bien. Zéro jargon d'école.",
  },
  fr: {
    lang: 'français',
    style:
      "Tu parles en français de France, comme un pote cool : tutoiement, expressions comme « regarde », « c'est génial », « mon pote », « capté », « franchement », et une référence occasionnelle au foot si ça tombe bien. Zéro jargon d'école.",
  },
  us: {
    lang: 'English (US)',
    style:
      'You talk like a high-energy, casual American friend: "Hey buddy", "Awesome", "Math is a breeze", occasional baseball or dollar-amount references when it fits. Zero academic jargon.',
  },
  uk: {
    lang: 'English (UK)',
    style:
      'You talk like a friendly, politely casual British mate: "Mate", "Brilliant", "Spot on", occasional football or pounds-amount references when it fits. Zero academic jargon.',
  },
};

const DEFAULT_REGION = 'qc';

// Nettoie la convention de notation avant injection (une ligne, longueur bornée).
function sanitizeNotation(value) {
  return String(value == null ? '' : value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, MAX_NOTATION_CHARS);
}

// Instruction système : persona + règles de format (le schéma JSON fait le reste).
// Écrite en français pour Gemini (qui comprend très bien la consigne quelle que soit la
// langue de sortie demandée) ; seule la règle #2 impose la VRAIE langue de réponse.
function buildSystemInstruction({ region, preferredNotation }) {
  const { lang, style } = REGION_STYLE[region] || REGION_STYLE[DEFAULT_REGION];
  const notation = sanitizeNotation(preferredNotation);
  const lines = [
    "Tu es RPVD, un ami qui aide un ado du secondaire à comprendre ses devoirs (maths, sciences, langues).",
    style,
    "Ton but : montrer le PATTERN (la méthode générale) derrière l'exercice, puis l'appliquer avec les chiffres de l'exercice, puis tout décortiquer étape par étape.",
    '',
    'Règles absolues :',
    '1. Réponds UNIQUEMENT avec le JSON demandé, rien autour.',
    `2. Tout le texte (problem_type, template, level_1_fallback, level_2_fallback, level_3_steps, final_answer) est en ${lang}, tutoiement/ton informel selon le style ci-dessus, phrases courtes, ton hyper casual. Interdit : jargon scolaire formel (« soit », « on pose », « d'où », « théorème », « démontrer » ou leurs équivalents anglais « thus », «  hence », « theorem », « prove »). Dis plutôt des verbes d'action simples (« on enlève / we remove », « on divise / we divide », « on regarde / we look at »).`,
    '3. « template » : une ou deux phrases qui décrivent la méthode générale, avec des trous numérotés {{0}}, {{1}}, {{2}}... (0-indexés, sans saut de numéro, chaque numéro apparaît au moins une fois). La phrase doit rester correcte quand on remplace chaque trou par son nom générique OU par sa valeur concrète.',
    "4. « slots » : un objet par trou, dans l'ordre (slots[i] correspond à {{i}}). « generic » = le rôle en mots simples avec son article, dans la langue de réponse (ex. « l'inconnue » / « the unknown »). « value » = la valeur exacte de l'exercice (ex. « x », « 7 », « 3 »). Entre 2 et 6 trous. Si deux trous ont le même rôle, répète le même generic.",
    '5. « level_1_fallback » = le template avec chaque {{i}} remplacé par slots[i].generic. « level_2_fallback » = le template avec chaque {{i}} remplacé par slots[i].value. Mot pour mot.',
    `6. « level_3_steps » : entre ${MIN_STEPS} et ${MAX_STEPS} étapes — LE NOMBRE DOIT SUIVRE LA VRAIE COMPLEXITÉ DE L'EXERCICE, pas une longueur fixe. Un exercice simple (ex. une équation à une étape) : ${MIN_STEPS}-3 étapes, ne rallonge pas artificiellement. Un exercice avec plusieurs sous-parties, plusieurs règles appliquées successivement, ou un raisonnement en plusieurs étapes distinctes (ex. système d'équations, problème à plusieurs inconnues, preuve, exercice à plusieurs questions) : va jusqu'à ${MAX_STEPS} étapes s'il le faut réellement, ne saute aucune étape intermédiaire juste pour rester court. « title » : 3 à 8 mots, une action concrète (ex. « On enlève 7 des deux bords » / « We subtract 7 from both sides »). « text » : 1 à 3 phrases, chaque calcul écrit au complet (ex. « 3x + 7 − 7 = 22 − 7, donc 3x = 15. »).`,
    '7. « final_answer » : la réponse finale, courte (ex. « x = 5 »).',
    '8. « problem_type » : nom court et clair du type de problème, dans la langue de réponse.',
    `9. « subject_guess » : une valeur parmi ${SUBJECTS.join(', ')} (toujours en anglais, c\'est une clé technique, pas du texte affiché).`,
    "10. « ocr_fail » = true si la photo est floue, vide, mal cadrée, ou ne montre clairement pas un exercice — indépendamment de la langue. Dans ce cas : problem_type = un nom court signalant le souci (dans la langue de réponse), subject_guess = « autre », template = \"\", slots = [], final_answer = \"\", hint = \"\", pitfall = \"\", consigne_translation = \"\", et level_1_fallback/level_2_fallback expliquent gentiment (dans la langue de réponse) qu'il faut reprendre la photo avec plus de lumière/de netteté, avec level_3_steps donnant 2 conseils photo concrets. S'il y a plusieurs exercices lisibles, prends le premier et mets ocr_fail = false.",
    '11. « hint » : UNE SEULE phrase (dans la langue de réponse) qui débloque la toute première étape sans jamais révéler la démarche complète ni la réponse. Ex. : « Regarde ce qui est déjà tout seul d\'un côté du = . » / "Look at what\'s already alone on one side of the =."',
    "12. « pitfall » : l'erreur la plus commune que font les élèves sur CE type d'exercice précis, en 1-2 phrases concrètes (dans la langue de réponse). Pas une généralité vague — un piège réel et spécifique à l'exercice.",
    '13. « consigne_translation » : réécris l\'énoncé de l\'exercice en mots très simples (dans la langue de réponse), pour un élève qui ne comprend pas ce qu\'on lui demande. Explique juste CE QU\'ON DEMANDE, jamais la méthode ni la réponse.',
    "14. « cheminement » : PAS une nouvelle explication — découpe le « template » (niveau 1) en étapes séquentielles courtes, dans l'ordre où elles apparaissent dans la phrase. MÊME PRINCIPE que la règle 6 : la longueur suit la complexité réelle, pas un nombre fixe — un exercice simple donne 3-5 étapes, un exercice qui enchaîne plusieurs règles/sous-parties peut aller jusqu'à 16 étapes si c'est justifié par le contenu du template. Chaque étape a un « type » : « concept » (mot-clé théorique, ex. « l'inconnue » / « the unknown ») ou « action » (geste concret ou formule isolée, ex. « x = -b/2a »). « isFormula » = true seulement si « text » est une expression mathématique isolée (pas une phrase). Si ocr_fail est true, cheminement = [].",
  ];
  if (notation) {
    lines.push('', `Formule l'explication en respectant strictement cette convention : ${notation}.`);
  }
  return lines.join('\n');
}

// Remplace chaque {{i}} par slots[i][mode]. Retourne null si aucun trou ou slot manquant.
function renderTemplate(template, slots, mode) {
  if (typeof template !== 'string' || !Array.isArray(slots)) return null;
  if (mode !== 'generic' && mode !== 'value') return null;
  let count = 0;
  let valid = true;
  const rendered = template.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, index) => {
    count += 1;
    const slot = slots[Number(index)];
    const text = slot && typeof slot[mode] === 'string' ? slot[mode].trim() : '';
    if (!text) {
      valid = false;
      return '';
    }
    return text;
  });
  return valid && count > 0 ? rendered : null;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Normalise la liste des slots ; null si un élément est incomplet (les index doivent tenir).
function normalizeSlots(raw) {
  if (!Array.isArray(raw)) return null;
  const slots = [];
  for (const item of raw) {
    const generic = cleanString(item && item.generic);
    const value = cleanString(item && item.value);
    if (!generic || !value) return null;
    slots.push({ generic, value });
  }
  return slots;
}

// Étapes valides uniquement, bornées à MAX_STEPS.
function normalizeSteps(raw) {
  if (!Array.isArray(raw)) return [];
  const steps = [];
  for (const item of raw) {
    const title = cleanString(item && item.title);
    const text = cleanString(item && item.text);
    if (title && text) steps.push({ title, text });
    if (steps.length >= MAX_STEPS) break;
  }
  return steps;
}

// Parsing typé du niveau 1 pour l'Arbre de Cheminement — pas une nouvelle génération pédagogique,
// juste une extraction bornée et filtrée de ce que Gemini a déjà produit dans `cheminement`.
const CHEMINEMENT_TYPES = ['concept', 'action'];
// Plafond relevé en même temps que MAX_STEPS — un exercice complexe a droit à un cheminement
// aussi long que le niveau 3, l'UI scrolle plutôt que de tronquer.
const MAX_CHEMINEMENT_STEPS = 16;
function normalizeCheminement(raw) {
  if (!Array.isArray(raw)) return [];
  const steps = [];
  for (const item of raw) {
    const type = CHEMINEMENT_TYPES.includes(item && item.type) ? item.type : null;
    const text = cleanString(item && item.text);
    if (!type || !text) continue;
    steps.push({ type, text, isFormula: Boolean(item && item.isFormula) });
    if (steps.length >= MAX_CHEMINEMENT_STEPS) break;
  }
  return steps;
}

// Valide la sortie brute de Gemini et construit l'objet Analysis (fallback si template invalide).
function buildAnalysis(raw) {
  if (!raw || typeof raw !== 'object') throw new HttpError(502, 'AI_ERROR');

  // Smart Retry (contrat §3) : image floue/inexploitable → code dédié OCR_FAIL (pas une
  // erreur technique), message ludique, crédit remboursé comme AI_ERROR côté appelant.
  if (raw.ocr_fail === true) {
    throw new HttpError(422, 'OCR_FAIL');
  }

  const problemType = cleanString(raw.problem_type) || 'Exercice';

  const subject = SUBJECTS.includes(raw.subject_guess) ? raw.subject_guess : 'autre';
  const finalAnswer = cleanString(raw.final_answer);

  let steps = normalizeSteps(raw.level_3_steps);
  if (steps.length === 0) throw new HttpError(502, 'AI_ERROR');
  if (steps.length < MIN_STEPS) {
    // Une seule étape reçue : on complète avec la réponse finale pour garder la cascade lisible.
    steps = steps.concat([{ title: 'On écrit la réponse', text: finalAnswer || steps[0].text }]);
  }

  const template = cleanString(raw.template);
  const slots = normalizeSlots(raw.slots);
  const level1 = slots ? renderTemplate(template, slots, 'generic') : null;
  const level2 = slots ? renderTemplate(template, slots, 'value') : null;
  const cheminement = normalizeCheminement(raw.cheminement);
  // Phase 2/3 (RPVD_FEATURES_PROMPT.md) : indice gradué, piège classique, traduction de
  // consigne — mêmes règles de nettoyage que les autres champs texte, jamais bloquants
  // (absents/vides → simplement pas affichés côté UI, pas d'erreur).
  const hint = cleanString(raw.hint);
  const pitfall = cleanString(raw.pitfall);
  const consigneTranslation = cleanString(raw.consigne_translation);

  if (level1 && level2) {
    return {
      problem_type: problemType,
      subject_guess: subject,
      template,
      slots,
      level_1: level1,
      level_2: level2,
      level_3_steps: steps,
      final_answer: finalAnswer,
      hint,
      pitfall,
      consigne_translation: consigneTranslation,
      cheminement,
    };
  }

  // Fallback : template inutilisable → textes fournis par Gemini, sans slots.
  const fallback1 = cleanString(raw.level_1_fallback);
  const fallback2 = cleanString(raw.level_2_fallback) || fallback1;
  if (!fallback1) throw new HttpError(502, 'AI_ERROR');
  return {
    problem_type: problemType,
    subject_guess: subject,
    template: fallback1,
    slots: [],
    level_1: fallback1,
    level_2: fallback2,
    level_3_steps: steps,
    final_answer: finalAnswer,
    hint,
    pitfall,
    consigne_translation: consigneTranslation,
    cheminement,
  };
}

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY || '';
}

// Masque la clé dans tout message destiné aux logs.
function scrub(message, key) {
  const text = String(message == null ? '' : message);
  return key ? text.split(key).join('***') : text;
}

// Extrait le texte JSON de la réponse Gemini (tolère des fences ``` éventuelles).
function extractJson(payload) {
  const candidate = payload && Array.isArray(payload.candidates) ? payload.candidates[0] : null;
  const parts = candidate && candidate.content && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
  const text = parts.map((part) => (typeof part.text === 'string' ? part.text : '')).join('').trim();
  if (!text) return null;
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(unfenced);
  } catch (_) {
    return null;
  }
}

// Un appel generateContent sur un modèle donné, avec timeout. Marque les 404 modèle ET les
// erreurs transitoires (503 « high demand », 429 quota) comme repliables sur le modèle suivant —
// vu en prod : gemini-3.6-flash renvoie parfois 503 UNAVAILABLE sous forte charge, et ça ne doit
// pas se traduire par un 502 immédiat côté client alors que gemini-2.5-flash répond, lui.
async function callModel(model, body, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.status === 404) {
      const notFound = new Error(`Modèle ${model} introuvable (404)`);
      notFound.modelNotFound = true;
      throw notFound;
    }
    if (response.status === 503 || response.status === 429) {
      const detail = await response.text().catch(() => '');
      const transient = new Error(`Gemini HTTP ${response.status} (transitoire) : ${detail.slice(0, 300)}`);
      transient.modelNotFound = true;
      throw transient;
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Point d'entrée : image/PDF en base64 → Analysis. Lance HttpError(502, 'AI_ERROR') en cas d'échec.
// `notationImage` (optionnel) : photo d'exemple de la notation demandée par l'élève — jamais
// stockée (contrat vie privée), envoyée telle quelle en pièce jointe supplémentaire à Gemini,
// juste pour cette analyse.
// Estimation de coût (contrat "logue chaque appel, connais le coût réel") — tarif par million
// de tokens input/output. À corriger si la tarification réelle de gemini-3.1-flash-lite diffère ;
// gardé en une seule constante pour être facile à ajuster sans chercher dans tout le fichier.
const COST_PER_MILLION_INPUT_TOKENS = 0.25;
const COST_PER_MILLION_OUTPUT_TOKENS = 1.5;

function estimateCost(inputTokens, outputTokens) {
  return (inputTokens * COST_PER_MILLION_INPUT_TOKENS + outputTokens * COST_PER_MILLION_OUTPUT_TOKENS) / 1_000_000;
}

// Chaîne de repli + métriques, factorisée pour tout appel Gemini JSON (image ou texte seul) —
// utilisée par analyzeImage, generateClone, generateExamPrep, analyzeTentative (Phase 1/6/7,
// RPVD_FEATURES_PROMPT.md). Lance HttpError(502, 'AI_ERROR') si aucun modèle ne répond.
async function runGeminiJson(body, taskType) {
  const startTime = Date.now();
  const key = getApiKey();
  if (!key) {
    console.error('[gemini] GEMINI_API_KEY manquante.');
    throw new HttpError(502, 'AI_ERROR');
  }

  let payload = null;
  let modelUsed = null;
  for (let i = activeModelIndex; i < MODEL_CHAIN.length; i += 1) {
    const model = MODEL_CHAIN[i];
    try {
      payload = await callModel(model, body, key);
      activeModelIndex = i;
      modelUsed = model;
      break;
    } catch (err) {
      // Repliable : modèle retiré (404), surcharge transitoire (503/429, voir callModel) OU
      // délai dépassé (souvent le même symptôme qu'un 503 — le modèle rame sous forte charge).
      const isTimeout = err && err.name === 'AbortError';
      const retryable = Boolean(err && err.modelNotFound) || isTimeout;
      const reason = isTimeout ? `délai dépassé (${TIMEOUT_MS} ms)` : scrub(err && err.message, key);
      if (retryable && i + 1 < MODEL_CHAIN.length) {
        console.warn(`[gemini] ${model} indisponible (${reason}), repli sur ${MODEL_CHAIN[i + 1]}.`);
        continue;
      }
      console.error(`[gemini] Échec ${model} : ${reason}`);
      throw new HttpError(502, 'AI_ERROR');
    }
  }

  if (!payload) throw new HttpError(502, 'AI_ERROR');

  if (payload.promptFeedback && payload.promptFeedback.blockReason) {
    console.error(`[gemini] Contenu bloqué : ${payload.promptFeedback.blockReason}`);
    throw new HttpError(502, 'AI_ERROR', "L'analyse a été bloquée. Essaie avec une autre photo, ton crédit est remboursé.");
  }

  const raw = extractJson(payload);
  if (!raw) {
    const finish = payload.candidates && payload.candidates[0] ? payload.candidates[0].finishReason : 'inconnu';
    console.error(`[gemini] Réponse sans JSON exploitable (finishReason: ${finish}).`);
    throw new HttpError(502, 'AI_ERROR');
  }

  // Phase 0.2 (RPVD_FEATURES_PROMPT.md) : "logue chaque appel Gemini, connais le coût réel".
  // Le nom des champs suit la casse de l'API Gemini (usageMetadata.*TokenCount).
  const usage = payload.usageMetadata || {};
  const inputTokens = Number(usage.promptTokenCount) || 0;
  const outputTokens = Number(usage.candidatesTokenCount) || 0;
  const metrics = {
    taskType,
    thinkingBudgetUsed: body.generationConfig.thinkingConfig.thinkingBudget,
    latencyMs: Date.now() - startTime,
    inputTokens,
    outputTokens,
    totalTokens: Number(usage.totalTokenCount) || inputTokens + outputTokens,
    estimatedCostUsd: estimateCost(inputTokens, outputTokens),
    modelUsed,
  };
  console.log('ANALYSIS_METRIC', JSON.stringify(metrics));

  return { raw, metrics };
}

async function analyzeImage({
  base64,
  mimeType,
  region = DEFAULT_REGION,
  preferredNotation = '',
  notationImage = null,
  taskType = 'full_analysis',
}) {
  const userParts = [
    { inlineData: { mimeType, data: base64 } },
    { text: "Voici le devoir. Analyse-le et renvoie uniquement le JSON demandé." },
  ];
  if (notationImage && notationImage.base64 && notationImage.mimeType) {
    userParts.push(
      { inlineData: { mimeType: notationImage.mimeType, data: notationImage.base64 } },
      {
        text: "L'image ci-dessus est un EXEMPLE de la notation/démarche demandée par l'élève (pas un exercice à résoudre) — imite ce style d'écriture dans level_1/level_2/level_3_steps.",
      },
    );
  }

  const body = {
    systemInstruction: { parts: [{ text: buildSystemInstruction({ region, preferredNotation }) }] },
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
      // 2048 suffisait avant l'ajout de `cheminement` (contrat rebrand) : le schéma JSON plus
      // gros (jusqu'à 10 étapes en plus des slots/level_3_steps/template) dépassait le budget
      // et Gemini tronquait la réponse en plein milieu (finishReason: MAX_TOKENS), donc un JSON
      // invalide → 502 systématique en prod. Vu en direct dans les logs Netlify.
      // Relevé avec MAX_STEPS/MAX_CHEMINEMENT_STEPS (14/16) : un exercice complexe qui utilise
      // vraiment tout ce plafond produit un JSON plus gros que ce que 8192 couvrait.
      maxOutputTokens: 12288,
      // Réflexion prolongée (contrat) : même modèle flash-lite, budget de raisonnement interne
      // plus généreux avant de répondre — meilleure qualité pédagogique sur les cas ambigus,
      // sans changer de modèle ni retomber sur la famille flash-3.x instable.
      thinkingConfig: { thinkingBudget: 4096 },
    },
  };

  const { raw, metrics } = await runGeminiJson(body, taskType);
  const analysis = buildAnalysis(raw);
  return { analysis, metrics };
}

// -----------------------------------------------------------------------------
// Phase 1 (RPVD_FEATURES_PROMPT.md) — Générateur de clones. Texte seul (pas de photo) :
// Gemini reçoit l'énoncé niveau 1 déjà généré et produit un exercice au même pattern.
// -----------------------------------------------------------------------------
const CLONE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    cloneExercise: { type: 'STRING', description: "L'énoncé complet du clone, dans la langue de réponse." },
    correctAnswer: { type: 'STRING', description: 'La réponse exacte, courte (ex. « x = 5 »).' },
    steps: { type: 'ARRAY', items: { type: 'STRING' }, description: '2 à 6 étapes courtes de résolution.' },
  },
  required: ['cloneExercise', 'correctAnswer', 'steps'],
};

function buildClonePrompt({ problemType, level1, lang }) {
  return [
    `Tu es un tuteur qui aide un ado du secondaire. L'exercice original était de type « ${problemType} », dont voici la méthode générale : ${level1}`,
    '',
    'Génère UN clone de cet exercice :',
    '- Mêmes pattern et structure mathématique que l\'original.',
    '- Nombres différents, qui donnent une réponse propre (pas de décimales infinies).',
    '- Contexte du monde réel différent si l\'original en avait un.',
    '',
    `Réponds UNIQUEMENT avec le JSON demandé, en ${lang}. N'ajoute AUCUNE explication en dehors du JSON, ne donne pas la démarche complète dans "cloneExercise" (juste l'énoncé).`,
  ].join('\n');
}

async function generateClone({ problemType, level1, region = DEFAULT_REGION }) {
  const { lang } = REGION_STYLE[region] || REGION_STYLE[DEFAULT_REGION];
  const body = {
    contents: [{ role: 'user', parts: [{ text: buildClonePrompt({ problemType, level1, lang }) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: CLONE_SCHEMA,
      // Variation maximale voulue (contrat) : on ne veut pas un clone quasi-identique à chaque fois.
      temperature: 1.0,
      maxOutputTokens: 2048,
      // Sortie courte et peu ambiguë (juste un énoncé + réponse) : pas besoin du budget de
      // réflexion complet de l'analyse principale.
      thinkingConfig: { thinkingBudget: 1024 },
    },
  };

  const { raw, metrics } = await runGeminiJson(body, 'generate_clone');

  const exercise = cleanString(raw.cloneExercise);
  const correctAnswer = cleanString(raw.correctAnswer);
  const steps = Array.isArray(raw.steps) ? raw.steps.map(cleanString).filter(Boolean) : [];

  // Validation minimale (contrat) : un clone sans énoncé ou sans réponse ne sert à rien et ne
  // doit jamais être stocké ni facturé au crédit de l'élève.
  if (!exercise || !correctAnswer || steps.length === 0) {
    console.error('[gemini] Clone invalide (champ manquant).');
    throw new HttpError(502, 'AI_ERROR');
  }

  return { clone: { exercise, correctAnswer, steps }, metrics };
}

// -----------------------------------------------------------------------------
// Phase 6 (RPVD_FEATURES_PROMPT.md) — Mode Veille d'Exam : les patterns critiques d'un examen.
// -----------------------------------------------------------------------------
const EXAM_PREP_SCHEMA = {
  type: 'OBJECT',
  properties: {
    patterns: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          importance: { type: 'STRING' },
          exampleQuestion: { type: 'STRING' },
          frequency: { type: 'STRING', format: 'enum', enum: ['rarely', 'sometimes', 'often', 'always'] },
        },
        required: ['name', 'importance', 'exampleQuestion', 'frequency'],
      },
    },
  },
  required: ['patterns'],
};

function buildExamPrepPrompt({ examTitle, lang }) {
  return [
    `L'élève a un examen : "${examTitle}"`,
    '',
    'Liste les 5 PATTERNS les plus importants qui représentent 80% des questions probables.',
    'Pour chaque pattern : le nom, pourquoi c\'est crucial (1 phrase), un exemple rapide de question, et la fréquence probable (rarely/sometimes/often/always — toujours en anglais, c\'est une clé technique).',
    '',
    `Réponds UNIQUEMENT avec le JSON demandé. Le texte (name, importance, exampleQuestion) est en ${lang}, ton casual, zéro jargon scolaire formel.`,
  ].join('\n');
}

async function generateExamPrep({ examTitle, region = DEFAULT_REGION }) {
  const { lang } = REGION_STYLE[region] || REGION_STYLE[DEFAULT_REGION];
  const body = {
    contents: [{ role: 'user', parts: [{ text: buildExamPrepPrompt({ examTitle, lang }) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: EXAM_PREP_SCHEMA,
      temperature: 0.8,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  };

  const { raw, metrics } = await runGeminiJson(body, 'exam_preparation');
  const FREQUENCIES = ['rarely', 'sometimes', 'often', 'always'];
  const patterns = (Array.isArray(raw.patterns) ? raw.patterns : [])
    .map((item) => ({
      name: cleanString(item && item.name),
      importance: cleanString(item && item.importance),
      exampleQuestion: cleanString(item && item.exampleQuestion),
      frequency: FREQUENCIES.includes(item && item.frequency) ? item.frequency : 'sometimes',
    }))
    .filter((item) => item.name && item.importance);

  if (patterns.length === 0) throw new HttpError(502, 'AI_ERROR');

  return { patterns, metrics };
}

// -----------------------------------------------------------------------------
// Phase 7 (RPVD_FEATURES_PROMPT.md) — Photo de tentative : localise l'erreur dans la copie de
// l'élève. Le prompt d'origine suggérait une chaîne de modèles plus « forts » (3.5/3.6-flash)
// pour cette tâche — DÉLIBÉRÉMENT PAS FAIT ICI : cette famille de modèles est celle qui causait
// des pannes en prod (503 « high demand » quasi systématiques, voir commentaire en tête de
// fichier) et le projet vient justement de converger sur flash-lite pour la stabilité. Réutilise
// la même chaîne stable que le reste — un modèle plus adapté sera reconsidéré seulement si la
// validation manuelle ci-dessous montre que flash-lite ne suffit pas.
// ⚠️ Pas encore validée sur de vraies copies d'élèves (voir PROJECT_HANDOFF.md) : la précision
// réelle du diagnostic n'a jamais été mesurée manuellement sur un échantillon, contrairement à
// ce que le contrat exige avant un lancement public de cette feature précise.
// -----------------------------------------------------------------------------
const TENTATIVE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    hasError: { type: 'BOOLEAN', description: "true si la tentative de l'élève contient une erreur." },
    errorLocation: { type: 'STRING', description: "Où se trouve l'erreur (ex. « étape 2 », description courte)." },
    errorExplanation: { type: 'STRING', description: "Explique gentiment ce qui cloche, sans donner directement la suite." },
    encouragement: { type: 'STRING', description: 'Une phrase positive, peu importe le résultat.' },
  },
  required: ['hasError', 'errorLocation', 'errorExplanation', 'encouragement'],
};

function buildTentativePrompt({ lang, style }) {
  return [
    "Tu es RPVD, un ami qui aide un ado du secondaire à comprendre ses devoirs.",
    style,
    "La PREMIÈRE image est l'exercice original. La DEUXIÈME image est la tentative de résolution de l'élève.",
    "Compare les deux : est-ce que la tentative contient une erreur ? Si oui, localise-la précisément et explique gentiment ce qui cloche, SANS donner directement la suite de la solution.",
    '',
    `Réponds UNIQUEMENT avec le JSON demandé, en ${lang}, ton casual, zéro jargon scolaire formel.`,
  ].join('\n');
}

async function analyzeTentative({ exerciseImage, attemptImage, region = DEFAULT_REGION }) {
  const { lang, style } = REGION_STYLE[region] || REGION_STYLE[DEFAULT_REGION];
  const body = {
    systemInstruction: { parts: [{ text: buildTentativePrompt({ lang, style }) }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: exerciseImage.mimeType, data: exerciseImage.base64 } },
          { inlineData: { mimeType: attemptImage.mimeType, data: attemptImage.base64 } },
          { text: 'Compare ces deux images et renvoie uniquement le JSON demandé.' },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: TENTATIVE_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 2048,
      // Reste fort (contrat §7.1) : localiser une erreur dans une copie manuscrite est plus
      // exigeant qu'une analyse initiale, on ne réduit pas le budget de réflexion ici.
      thinkingConfig: { thinkingBudget: 4096 },
    },
  };

  const { raw, metrics } = await runGeminiJson(body, 'analyze_tentative');
  return {
    result: {
      hasError: Boolean(raw.hasError),
      errorLocation: cleanString(raw.errorLocation),
      errorExplanation: cleanString(raw.errorExplanation),
      encouragement: cleanString(raw.encouragement),
    },
    metrics,
  };
}

module.exports = {
  GEMINI_MODEL,
  MODEL_CHAIN,
  TIMEOUT_MS,
  RESPONSE_SCHEMA,
  SUBJECTS,
  analyzeImage,
  generateClone,
  generateExamPrep,
  analyzeTentative,
  renderTemplate,
  buildAnalysis,
  buildSystemInstruction,
};
