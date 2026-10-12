'use strict';
// Confirmation d'un achat de capsule / bootcamp (webhook Stripe, metadata.kind = 'capsule_order').
// Idempotent par stripe_session_id (contrainte unique sur orders). Crée la ligne orders, un code
// d'essai PWA 30 jours pour Examen et Bootcamp (table activation_codes), puis envoie le courriel
// d'accès via Resend. Si une étape échoue, la commande est retirée et l'erreur remontée : Stripe
// réessaie le webhook et le client ne perd rien.

const { siteUrl } = require('./legal');
const { sendEmail, capsuleAccessEmail, bootcampAccessEmail } = require('./email');
const { PWA_CODE_PRODUCTS, PWA_TRIAL_DAYS } = require('./capsules');
const { TRIAL_CREDITS } = require('./codes');

async function confirmCapsuleOrder(db, session) {
  const md = session.metadata || {};
  const email = String((session.customer_details && session.customer_details.email) || session.customer_email || '').toLowerCase();
  if (!email || session.payment_status !== 'paid') return { ok: false, reason: 'unpaid_or_no_email' };

  const productType = md.product_type;
  const { data: order, error: insertError } = await db
    .from('orders')
    .insert({
      email,
      product_type: productType,
      capsule_id: md.capsule_id || null,
      bootcamp_id: md.bootcamp_id || null,
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      amount: session.amount_total || 0,
      currency: session.currency || 'cad',
    })
    .select('id, access_token')
    .single();
  if (insertError) {
    if (insertError.code === '23505') return { ok: false, reason: 'duplicate' }; // déjà traité
    throw insertError;
  }

  try {
    let pwaCode = null;
    if (PWA_CODE_PRODUCTS.includes(productType)) {
      const expiresAt = new Date(Date.now() + PWA_TRIAL_DAYS * 24 * 3600 * 1000).toISOString();
      const { data: codes, error: codeError } = await db.rpc('create_activation_codes', {
        p_type: 'trial',
        p_plan: 'trial',
        p_credits: TRIAL_CREDITS,
        p_count: 1,
        p_email: email,
        p_batch_id: null,
        p_stripe_session_id: session.id,
        p_expires_at: expiresAt,
      });
      if (codeError) throw codeError;
      pwaCode = Array.isArray(codes) ? codes[0] : null;
      if (pwaCode) {
        const { data: row } = await db.from('activation_codes').select('id').eq('code', pwaCode).maybeSingle();
        if (row) await db.from('orders').update({ pwa_code_id: row.id }).eq('id', order.id);
      }
    }

    const appUrl = `${siteUrl()}/app`;
    let message;
    if (productType === 'bootcamp') {
      const { data: bc, error } = await db.from('bootcamps').select('*').eq('id', md.bootcamp_id).single();
      if (error) throw error;
      const when = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'short' }).format(new Date(bc.starts_at));
      message = bootcampAccessEmail({ title: bc.title, when, meetingUrl: bc.meeting_url, chatUrl: bc.chat_url, pwaCode, appUrl });
    } else {
      const { data: cap, error } = await db.from('capsules').select('slug,title').eq('id', md.capsule_id).single();
      if (error) throw error;
// Lien magique à usage unique (jamais d'URL vidéo ni de jeton réutilisable dans le courriel).
      const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${siteUrl()}/mes-capsules` } });
      if (linkError) throw linkError;
      message = capsuleAccessEmail({ title: cap.title, url: link.properties.action_link, pwaCode, appUrl });
    }
    const { sent } = await sendEmail({ to: email, ...message });
    if (!sent) throw new Error('Courriel d\'accès non envoyé');

    // Achat = on arrête la séquence de relance pour ce sujet (voir capsule-cron).
    if (md.capsule_id) {
      const { data: cap } = await db.from('capsules').select('topic_key').eq('id', md.capsule_id).maybeSingle();
      if (cap) await db.from('capsule_requests').update({ status: 'purchased' }).eq('email', email).eq('topic_key', cap.topic_key);
    }
    return { ok: true };
  } catch (err) {
    await db.from('orders').delete().eq('id', order.id); // permet la reprise au prochain essai de Stripe
    throw err;
  }
}

module.exports = { confirmCapsuleOrder };
