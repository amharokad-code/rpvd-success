// Client API : Netlify Functions + RPC Supabase (même backend que la PWA, rien de dupliqué).
// Chaque appel ajoute `Authorization` (JWT Supabase) et `x-device-fingerprint`.
// Jamais d'appel direct à Gemini depuis l'app : la clé reste côté Functions.
import { API_URL, type Region } from '../config'
import { getDeviceFingerprint } from './device'
import { supabase } from './supabase'
import type { AnalyzeResponse, Analysis, LibraryItem, Profile } from './types'

const CODE_PATTERN = /^[A-Z_]+$/
// Gemini peut être lent (jusqu'à ~26 s côté serveur) : 60 s de marge côté client.
const REQUEST_TIMEOUT_MS = 60_000

export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message?: string, status = 0) {
    super(message ?? code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const [{ data }, fingerprint] = await Promise.all([supabase.auth.getSession(), getDeviceFingerprint()])
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-device-fingerprint': fingerprint,
  }
  const token = data.session?.access_token
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

// POST vers une Netlify Function. PAS de nouvelle tentative automatique : les appels qui
// consomment un crédit (analyse) ne doivent jamais être rejoués à l'aveugle — si le délai client
// expire pendant que le serveur travaille encore, un retry facturerait deux fois. Le serveur
// rembourse déjà tout échec Gemini ; c'est à l'utilisateur de relancer.
async function callFunction<T>(name: string, body?: unknown): Promise<T> {
  const headers = await authHeaders()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${API_URL}/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    })
  } catch {
    throw new ApiError('NETWORK')
  } finally {
    clearTimeout(timer)
  }

  let json: { error?: string; message?: string } | null = null
  try {
    json = await response.json()
  } catch {
    json = null
  }
  if (!response.ok) throw new ApiError(json?.error ?? 'SERVER_ERROR', json?.message, response.status)
  return (json ?? {}) as T
}

function toApiError(error: { message?: string; name?: string } | null): ApiError {
  const message = error?.message ?? ''
  if (/network request failed|failed to fetch|load failed/i.test(message)) return new ApiError('NETWORK')
  return new ApiError(CODE_PATTERN.test(message) ? message : 'SERVER_ERROR', message, 500)
}

// --- Netlify Functions ------------------------------------------------------

export function analyzeHomework(params: { base64: string; mimeType: string; region: Region }) {
  return callFunction<AnalyzeResponse>('analyze-homework', {
    imageBase64: params.base64,
    mimeType: params.mimeType,
    region: params.region,
  })
}

export function reverifyDevice() {
  return callFunction<{ ok: boolean }>('reverify-device')
}

export function deleteAccount() {
  return callFunction<{ ok: boolean }>('delete-account')
}

export async function reportAgeGate(payload: {
  market: Region
  ageConfirmed: boolean
  parentAuthDeclared: boolean
  blocked?: boolean
}): Promise<void> {
  try {
    const fingerprint = await getDeviceFingerprint()
    await fetch(`${API_URL}/age-gate-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-fingerprint': fingerprint },
      body: JSON.stringify(payload),
    })
  } catch {
    // best-effort, jamais bloquant (même contrat que le web)
  }
}

// --- RPC / tables Supabase (RLS : chaque utilisateur ne voit que ses lignes) ---

export async function fetchProfile(): Promise<Profile> {
  const { data, error } = await supabase.rpc('get_my_profile')
  if (error) throw toApiError(error)
  return data as Profile
}

export async function savePreferences(region: Region, preferredNotation = ''): Promise<void> {
  const { error } = await supabase.rpc('set_preferences', {
    p_preferred_notation: preferredNotation,
    p_region: region,
  })
  if (error) throw toApiError(error)
}

export async function saveToLibrary(submissionId: string, subject: string, topicName: string): Promise<void> {
  const { error } = await supabase.rpc('save_submission', {
    p_submission_id: submissionId,
    p_subject: subject,
    p_topic_name: topicName,
  })
  if (error) throw toApiError(error)
}

export async function fetchLibrary(): Promise<LibraryItem[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, subject, topic_name, problem_type, analysis, created_at')
    .eq('is_saved', true)
    .order('created_at', { ascending: false })
  if (error) throw toApiError(error)
  return (data ?? []) as LibraryItem[]
}

export async function fetchAnalysisById(id: string): Promise<Analysis | null> {
  const { data, error } = await supabase.from('submissions').select('analysis').eq('id', id).maybeSingle()
  if (error) throw toApiError(error)
  return (data?.analysis ?? null) as Analysis | null
}
