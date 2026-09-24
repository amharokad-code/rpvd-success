// Client API : Netlify Functions + RPC Supabase (contrat §1 et §3).
// Les appels aux functions ajoutent automatiquement `Authorization` et `x-device-fingerprint`.
import { supabase } from './supabase'
import { getDeviceFingerprint } from '../utils/security-fingerprint'

const FUNCTIONS_BASE = '/.netlify/functions'
const CODE_PATTERN = /^[A-Z_]+$/

// Erreur typée : `code` = un code d'erreur du contrat, ou 'NETWORK' si la requête n'a pas abouti.
export class ApiError extends Error {
  constructor(code, message, status) {
    super(message || code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function buildHeaders() {
  const [{ data }, fingerprint] = await Promise.all([supabase.auth.getSession(), getDeviceFingerprint()])
  const token = data?.session?.access_token
  const headers = {
    'Content-Type': 'application/json',
    'x-device-fingerprint': fingerprint,
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

// POST vers une Netlify Function ; toute réponse non-2xx devient une ApiError.
async function callFunction(name, body) {
  const headers = await buildHeaders()
  let response
  try {
    response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new ApiError('NETWORK', undefined, 0)
  }

  let json = null
  try {
    json = await response.json()
  } catch {
    json = null
  }

  if (!response.ok) {
    throw new ApiError(json?.error ?? 'SERVER_ERROR', json?.message, response.status)
  }
  return json ?? {}
}

// Les RPC lèvent des exceptions dont le message est un code (`NOT_FOUND`, `NO_CREDITS`…).
function toApiError(error) {
  if (error instanceof ApiError) return error
  const message = error?.message || ''
  if (message === 'Failed to fetch' || message === 'Load failed' || error?.name === 'TypeError') {
    return new ApiError('NETWORK', undefined, 0)
  }
  const code = CODE_PATTERN.test(message) ? message : 'SERVER_ERROR'
  return new ApiError(code, message, 500)
}

// --- Netlify Functions -----------------------------------------------------

export async function analyzeHomework({ base64, mimeType, region, notationText, notationImage }) {
  return callFunction('analyze-homework', {
    imageBase64: base64,
    mimeType,
    region,
    notationText: notationText || undefined,
    notationImageBase64: notationImage?.base64,
    notationMimeType: notationImage?.mimeType,
  })
}

export async function activateCode(code) {
  return callFunction('activate-code', { code })
}

export async function requestTrial(email) {
  return callFunction('request-trial', { email })
}

// Contrat pricing v3 : abonnement Stripe récurrent (Basic/Pro) — l'utilisateur doit être connecté,
// le serveur attache l'abonnement à son compte via client_reference_id.
export async function createCheckout(plan, region) {
  return callFunction('create-checkout', { plan, region })
}

// Portail client Stripe : gérer le moyen de paiement ou annuler l'abonnement en 1 clic.
export async function createBillingPortalSession() {
  return callFunction('create-portal-session', {})
}

// Phase 1 (RPVD_FEATURES_PROMPT.md) : génère un exercice clone du pattern d'une analyse déjà
// stockée. Consomme 1 crédit côté serveur.
export async function generateClone(submissionId, region) {
  return callFunction('generate-clone', { submissionId, region })
}

// Phase 5 : simulation chronométrée sur les clones déjà générés d'une soumission (gratuit).
export async function startSimulation(submissionId, exerciseCount) {
  return callFunction('start-simulation', { submissionId, exerciseCount })
}

export async function finishSimulation(simulationId, correctCount, timeSpentSeconds) {
  return callFunction('finish-simulation', { simulationId, correctCount, timeSpentSeconds })
}

// Phase 6 : patterns critiques d'un examen à venir. Consomme 1 crédit côté serveur.
export async function generateExamPrep(examTitle, region) {
  return callFunction('exam-preparation', { examTitle, region })
}

// --- RPC Supabase (SECURITY INVOKER / garde auth.uid()) ---------------------

export async function fetchProfile() {
  const { data, error } = await supabase.rpc('get_my_profile')
  if (error) throw toApiError(error)
  return data
}

export async function savePreferences({ preferred_notation, region }) {
  const { error } = await supabase.rpc('set_preferences', {
    p_preferred_notation: preferred_notation ?? '',
    p_region: region,
  })
  if (error) throw toApiError(error)
}

export async function saveToLibrary(submissionId, subject, topicName) {
  const { error } = await supabase.rpc('save_submission', {
    p_submission_id: submissionId,
    p_subject: subject,
    p_topic_name: topicName,
  })
  if (error) throw toApiError(error)
}

export async function removeFromLibrary(submissionId) {
  const { error } = await supabase.rpc('unsave_submission', { p_submission_id: submissionId })
  if (error) throw toApiError(error)
}

// Bibliothèque : lecture directe (policy SELECT sur `submissions` où user_id = auth.uid()).
export async function fetchLibrary() {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, subject, topic_name, problem_type, analysis, created_at')
    .eq('is_saved', true)
    .order('created_at', { ascending: false })
  if (error) throw toApiError(error)
  return data ?? []
}
