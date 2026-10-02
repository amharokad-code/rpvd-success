import type { Region } from '../config'

export type CheminementStep = { type: 'concept' | 'action'; text: string; isFormula: boolean }
export type Level3Step = { title: string; text: string }

// Moteur D « RPVD Visuel v2 » : un des 3 niveaux (expressions en LaTeX, rendues par MathFiche).
export type VisualLevel = {
  niveau: number
  connu: string
  cherche: string
  schema_ascii: string
  demarche: { expression: string; explication: string }[]
  reponse: string
  principe: string
}

// Objet `Analysis` renvoyé par analyze-homework (voir netlify/functions/_lib/gemini.js).
// hint/pitfall/consigne_translation sont retirés côté serveur pour les comptes Basic.
export type Analysis = {
  problem_type: string
  subject_guess: string
  template?: string
  level_1?: string
  level_2?: string
  level_3_steps: Level3Step[]
  final_answer: string
  hint?: string
  pitfall?: string
  consigne_translation?: string
  cheminement?: CheminementStep[]
  // MÉTHODE RPVD : absents des anciennes analyses (repli sur level_1/level_2).
  connu?: string[]
  cherche?: string
  demarche?: string
  principe?: string
  // Moteur D v2 : 3 niveaux structurés (absents des analyses plus anciennes).
  niveaux?: VisualLevel[]
}

export type AnalyzeResponse = {
  submission_id: string | null
  credits_remaining: number
  streak_days: number | null
  analysis: Analysis
  fingerprint_notice?: boolean
}

export type Profile = {
  id: string
  email: string | null
  credits: number
  plan: string
  plan_expires_at: string | null
  has_fingerprint: boolean
  preferred_notation: string | null
  region: Region
  streak_days: number
  last_analysis_date: string | null
  created_at: string
}

export type LibraryItem = {
  id: string
  subject: string | null
  topic_name: string | null
  problem_type: string | null
  analysis: Analysis
  created_at: string
}
