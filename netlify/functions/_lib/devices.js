'use strict';
// Appareils autorisés pour les capsules : 2 au maximum par courriel, accès à vie sur ces appareils.
const { HttpError } = require('./http');

const MAX_DEVICES = 2;
const DEVICE_MESSAGE = 'Cet appareil n’est pas autorisé : tes 2 appareils sont déjà enregistrés. Écris-nous pour en changer.';

async function deviceState(db, email, fingerprint) {
  const { data, error } = await db.from('capsule_devices').select('fingerprint').eq('email', email);
  if (error) throw error;
  const known = (data || []).some((d) => d.fingerprint === fingerprint);
  return { known, count: (data || []).length, allowed: known || (data || []).length < MAX_DEVICES };
}

// Autorise l'appareil s'il est déjà connu ou s'il reste une place ; sinon refuse.
async function authorizeDevice(db, email, fingerprint) {
  if (!fingerprint) throw new HttpError(400, 'BAD_REQUEST', "Empreinte d'appareil manquante.");
  const state = await deviceState(db, email, fingerprint);
  if (!state.allowed) throw new HttpError(403, 'FINGERPRINT_MISMATCH', DEVICE_MESSAGE);
  if (!state.known) {
    const { error } = await db.from('capsule_devices').insert({ email, fingerprint });
    if (error && error.code !== '23505') throw error;
  }
}

module.exports = { MAX_DEVICES, DEVICE_MESSAGE, deviceState, authorizeDevice };
