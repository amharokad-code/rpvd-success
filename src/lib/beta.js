// Bêta fermée : accès (fenêtre de 72 h), feedback par fiche et votes. Tout passe par le client
// Supabase avec RLS (l'élève ne voit et ne modifie que ses lignes, seulement pendant sa fenêtre).
import { supabase } from './supabase'
import { BETA_POLLS } from '../config/betaVotes'

export const BETA_WINDOW_HOURS = 72
export const BETA_FICHES_BEFORE_INVITE = 2

// Le compte est-il en bêta ET dans sa fenêtre ? (profil = get_my_profile)
export function isBetaActive(profile, now = Date.now()) {
  if (!profile?.is_beta || !profile?.beta_started_at) return false
  return now < new Date(profile.beta_started_at).getTime() + BETA_WINDOW_HOURS * 3600 * 1000
}

export function betaHoursLeft(profile, now = Date.now()) {
  if (!profile?.beta_started_at) return 0
  const ms = new Date(profile.beta_started_at).getTime() + BETA_WINDOW_HOURS * 3600 * 1000 - now
  return Math.max(0, Math.ceil(ms / 3600000))
}

// Retire toute saisie au-delà de la limite (le champ HTML a déjà maxLength ; ceci est un filet).
export function clip(text, max) {
  return String(text ?? '').slice(0, max)
}

// Valide un vote avant envoi : ids connus, nombre de choix ≤ max, « autre » ≤ limite.
export function validateVote(poll, choices, autre) {
  const known = new Set(poll.options.map((o) => o.id))
  const list = Array.isArray(choices) ? choices.filter((c) => known.has(c)) : []
  const max = poll.type === 'single' ? 1 : poll.max
  const cleanAutre = poll.autre ? clip(autre, poll.autre.max).trim() : ''
  return { choices: list.slice(0, max), autre: cleanAutre || null }
}

export async function loadFeedback(submissionId) {
  const { data } = await supabase.from('beta_feedback').select('niveau_debloquant, refaire_seul, commentaire').eq('submission_id', submissionId).maybeSingle()
  return data || null
}

export async function saveFeedback(userId, submissionId, values) {
  const { error } = await supabase.from('beta_feedback').upsert(
    {
      user_id: userId,
      submission_id: submissionId,
      niveau_debloquant: values.niveau || null,
      refaire_seul: values.refaire || null,
      commentaire: values.commentaire ? clip(values.commentaire, 140) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,submission_id' },
  )
  if (error) throw error
}

export async function loadVotes() {
  const { data } = await supabase.from('beta_votes').select('poll_key, choices, autre')
  const byKey = {}
  for (const row of data || []) byKey[row.poll_key] = row
  return byKey
}

export async function saveVote(userId, pollKey, choices, autre) {
  const poll = BETA_POLLS.find((p) => p.key === pollKey)
  if (!poll) throw new Error('POLL_UNKNOWN')
  const v = validateVote(poll, choices, autre)
  const { error } = await supabase.from('beta_votes').upsert(
    { user_id: userId, poll_key: pollKey, choices: v.choices, autre: v.autre, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,poll_key' },
  )
  if (error) throw error
}

export async function countMySubmissions() {
  const { count } = await supabase.from('submissions').select('id', { count: 'exact', head: true })
  return count || 0
}
