// Logique pure de la mesure publicitaire côté navigateur (src/utils/ads-core.mjs) :
// décision de consentement, pages autorisées, validation des paramètres d'attribution, événements.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeLabel,
  sanitizeClickId,
  parseAttribution,
  mergeAttribution,
  labelsOf,
  clickIdsOf,
  buildFbc,
  cleanPixelId,
  isTrackablePath,
  decidePixels,
  snapEventName,
  snapParams,
  newEventId,
  isPurchaseEventId,
} from '../ads-core.mjs'

const META = '1234567890123456'
const SNAP = '0a1b2c3d-1111-2222-3333-444455556666'
const OK = { consent: { necessary: true, marketing: true, ts: 1 }, pathname: '/', metaId: META, snapId: SNAP }

test('décision des pixels : jamais sans consentement marketing explicite', () => {
  assert.deepEqual(decidePixels(OK), { meta: true, snap: true })
  for (const consent of [null, undefined, {}, { marketing: false }, { marketing: 'true' }, { marketing: 1 }, { necessary: true }]) {
    assert.deepEqual(decidePixels({ ...OK, consent }), { meta: false, snap: false }, JSON.stringify(consent))
  }
})

test('décision des pixels : identifiants absents ou invalides = module inerte', () => {
  assert.deepEqual(decidePixels({ ...OK, metaId: undefined, snapId: undefined }), { meta: false, snap: false })
  assert.deepEqual(decidePixels({ ...OK, metaId: 'abc', snapId: 'pas-un-uuid' }), { meta: false, snap: false })
  assert.deepEqual(decidePixels({ ...OK, snapId: '' }), { meta: true, snap: false })
  assert.deepEqual(decidePixels({ ...OK, metaId: '' }), { meta: false, snap: true })
})

test('pages sans identifiant personnel seulement', () => {
  for (const p of ['/', '/vote', '/bootcamp', '/reserver', '/merci', '/merci/', '/accueil']) assert.equal(isTrackablePath(p), true, p)
  for (const p of ['/rembourser', '/desabonner', '/admin/bootcamp', '/app', '/legal/privacy', '/legal/contact', '/reserver/x', '']) {
    assert.equal(isTrackablePath(p), p === '', p) // chaîne vide = racine
  }
  assert.deepEqual(decidePixels({ ...OK, pathname: '/rembourser' }), { meta: false, snap: false })
  assert.deepEqual(decidePixels({ ...OK, pathname: '/app' }), { meta: false, snap: false })
  assert.deepEqual(decidePixels({ ...OK, pathname: '/desabonner' }), { meta: false, snap: false })
})

test('format des identifiants de pixel', () => {
  assert.equal(cleanPixelId('meta', ' 1234567890123456 '), META)
  assert.equal(cleanPixelId('meta', '12ab'), null)
  assert.equal(cleanPixelId('meta', "1234567890'); alert(1"), null)
  assert.equal(cleanPixelId('snap', SNAP), SNAP)
  assert.equal(cleanPixelId('snap', 'xyz'), null)
  assert.equal(cleanPixelId('autre', META), null)
  assert.equal(cleanPixelId('meta', undefined), null)
})

test('sanitizeLabel et sanitizeClickId', () => {
  assert.equal(sanitizeLabel('tiktok'), 'tiktok')
  assert.equal(sanitizeLabel('<b>été</b>'), 'bétéb')
  assert.equal(sanitizeLabel('x'.repeat(200), 40).length, 40)
  assert.equal(sanitizeLabel('   '), null)
  assert.equal(sanitizeLabel(undefined), null)
  assert.equal(sanitizeClickId('IwAR0aBc_dEf-12345', 10, 512), 'IwAR0aBc_dEf-12345')
  assert.equal(sanitizeClickId('trop court', 10, 512), null)
  assert.equal(sanitizeClickId('abc def ghi jkl', 10, 512), null)
})

test('parseAttribution : étiquettes, fbclid et ScCid d\'une adresse de pub', () => {
  const now = 1760000000000
  const a = parseAttribution('?src=tiktok&utm_source=ig&utm_medium=paid&utm_campaign=oct_s1&utm_content=video-a&utm_term=maths&fbclid=IwAR0aBc_dEf-12345&ScCid=AbCdEf12_-xyz', now)
  assert.deepEqual(a, {
    src: 'tiktok',
    utm_source: 'ig',
    utm_medium: 'paid',
    utm_campaign: 'oct_s1',
    utm_content: 'video-a',
    utm_term: 'maths',
    fbclid: 'IwAR0aBc_dEf-12345',
    fbclid_ts: now,
    sccid: 'AbCdEf12_-xyz',
  })
  assert.equal(parseAttribution('?sccid=AbCdEf12_-xyz').sccid, 'AbCdEf12_-xyz', 'insensible à la casse du nom')
})

test('parseAttribution : valeurs hostiles retirées ou ignorées, rien d\'utilisable = null', () => {
  assert.equal(parseAttribution(''), null)
  assert.equal(parseAttribution('?autre=1&page=2'), null)
  assert.equal(parseAttribution('?fbclid=a b<c>&ScCid=x'), null)
  assert.deepEqual(parseAttribution('?src=<script>'), { src: 'script' }) // sans < >, le texte restant est inoffensif
  const a = parseAttribution('?src=%3Cscript%3Ealert(1)%3C%2Fscript%3E&email=a@b.com')
  assert.ok(a && !/[<>()/]/.test(a.src) && !('email' in a))
  assert.equal(parseAttribution(undefined), null)
  assert.equal(parseAttribution(null), null)
})

test('mergeAttribution : dernier contact avec étiquettes gagne, sinon on garde', () => {
  const before = { src: 'tiktok', utm_campaign: 'oct_s1', fbclid: 'IwAR0aBc_dEf-12345', fbclid_ts: 111 }
  assert.deepEqual(mergeAttribution(before, null), before)
  const sameClick = mergeAttribution(before, { fbclid: 'IwAR0aBc_dEf-12345', fbclid_ts: 999 })
  assert.equal(sameClick.src, 'tiktok', 'un clic sans étiquette ne remplace pas la provenance')
  assert.equal(sameClick.fbclid_ts, 111, 'même fbclid : horodatage d\'origine conservé')
  const newCampaign = mergeAttribution(before, { src: 'snap', utm_campaign: 'nov' })
  assert.equal(newCampaign.src, 'snap')
  assert.equal(newCampaign.utm_campaign, 'nov')
  assert.equal(newCampaign.fbclid, 'IwAR0aBc_dEf-12345')
  assert.deepEqual(mergeAttribution(undefined, { src: 'a' }), { src: 'a' })
})

test('labelsOf n\'expose jamais les identifiants de clic (c\'est tout ce que reçoit le vote)', () => {
  const all = { src: 'meta', utm_term: 't', fbclid: 'IwAR0aBc_dEf-12345', fbclid_ts: 1, sccid: 'AbCdEf12_-xyz' }
  assert.deepEqual(labelsOf(all), { src: 'meta', utm_term: 't' })
  assert.deepEqual(clickIdsOf(all), { fbclid: 'IwAR0aBc_dEf-12345', fbclid_ts: 1, sccid: 'AbCdEf12_-xyz' })
})

test('buildFbc : fb.1.<ms>.<fbclid>, casse conservée', () => {
  assert.equal(buildFbc('IwAR0aBc_dEf-12345', 1760000000000), 'fb.1.1760000000000.IwAR0aBc_dEf-12345')
})

test('événements : correspondance Snap et paramètres sans donnée personnelle', () => {
  assert.equal(snapEventName('PageView'), 'PAGE_VIEW')
  assert.equal(snapEventName('ViewContent'), 'VIEW_CONTENT')
  assert.equal(snapEventName('Lead'), 'SIGN_UP')
  assert.equal(snapEventName('InitiateCheckout'), 'START_CHECKOUT')
  assert.equal(snapEventName('Purchase'), 'PURCHASE')
  assert.equal(snapEventName('Inconnu'), null)
  const p = snapParams({ value: 20, currency: 'CAD', content_ids: ['bootcamp-rpvd'], num_items: 1, transaction_id: 'p_x', content_name: 'Bootcamp RPVD' }, 'p_x')
  assert.deepEqual(p, { client_dedup_id: 'p_x', price: 20, currency: 'CAD', item_ids: ['bootcamp-rpvd'], number_items: 1, description: 'Bootcamp RPVD', transaction_id: 'p_x' })
  assert.deepEqual(snapParams({}, 'ld_1'), { client_dedup_id: 'ld_1' })
  assert.ok(!JSON.stringify(p).includes('@'))
})

test('identifiant d\'achat partagé avec le serveur : p_<uuid> seulement', () => {
  const id = newEventId('p')
  assert.match(id, /^p_[0-9a-f-]{36}$/)
  assert.equal(isPurchaseEventId(id), true)
  assert.equal(isPurchaseEventId(newEventId('p', '0b6f6c1e-8d3a-4f6e-9a55-0123456789ab')), true)
  assert.equal(isPurchaseEventId(newEventId('ld')), false, 'un autre préfixe n\'est pas un achat')
  for (const bad of [null, undefined, '', 'p_123', '<script>', 'p_0b6f6c1e-8d3a-4f6e-9a55-0123456789ab<']) assert.equal(isPurchaseEventId(bad), false, String(bad))
  assert.notEqual(newEventId('p'), newEventId('p'))
})
