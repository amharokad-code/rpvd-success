'use strict';
// Analyse produit anonyme : entonnoir, points de sortie, erreurs, santé du moteur, activation / rétention / churn,
// et diagnostics en clair (« où ça bloque » + quoi corriger). Fonctions PURES : aucune lecture réseau ici
// (voir admin-insights.js), aucune donnée personnelle (ni courriel, ni IP, ni identifiant de compte en sortie).

const FUNNEL = [
  { id: 'pageview', label: 'Visite du site' },
  { id: 'cta_click', label: 'Clic sur « Commencer »' },
  { id: 'age_gate_confirmed', label: 'Porte d’âge confirmée' },
  { id: 'signup_started', label: 'Lien magique demandé' },
  { id: 'app_opened', label: 'Connecté (outil ouvert)' },
  { id: 'file_selected', label: 'Photo choisie' },
  { id: 'analysis_started', label: 'Analyse lancée' },
  { id: 'analysis_success', label: 'Fiche reçue' },
  { id: 'level_2', label: 'Niveau 2 ouvert' },
  { id: 'level_3', label: 'Niveau 3 ouvert' },
];

const MONEY = [
  { id: 'paywall_shown', label: 'Mur de paiement vu' },
  { id: 'checkout_started', label: 'Paiement démarré' },
  { id: 'checkout_completed', label: 'Paiement réussi' },
];

// Pour chaque étape : où chercher quand ça fuit, et quoi essayer.
const FIX_HINTS = {
  pageview: 'Trafic : vérifie que les pubs / liens arrivent bien (source ci-dessous).',
  cta_click: 'Le haut de page ne donne pas envie de cliquer : titre, bouton principal visible sans défiler, promesse claire (mobile surtout).',
  age_gate_confirmed: 'La porte d’âge fait fuir : réduis les champs/cases, clarifie pourquoi on la demande.',
  signup_started: 'Le formulaire de courriel bloque : champ trop caché, erreur de saisie, peur de donner son courriel. Teste « sans mot de passe » en gros.',
  app_opened: 'Le lien magique n’aboutit pas : courriel en spam / lent (RESEND_API_KEY, domaine d’envoi), lien ouvert dans un autre navigateur, redirection /app.',
  file_selected: 'L’élève arrive sur l’outil mais ne dépose rien : zone de dépôt peu claire, pas de photo sous la main. Ajoute un exemple en un clic.',
  analysis_started: 'La photo est choisie mais l’analyse n’est pas lancée : bouton « Analyser » peu visible, ou crédits à 0 sans explication.',
  analysis_success: 'L’analyse échoue : voir « Erreurs d’analyse » (photo illisible, délai, 502).',
  level_2: 'La fiche arrive mais personne ne continue : la valeur perçue du niveau 1 est faible, ou le bouton « niveau suivant » passe inaperçu.',
  level_3: 'Peu de gens vont jusqu’au détail : normal si le niveau 2 suffit ; sinon raccourcis le niveau 2.',
  paywall_shown: 'Peu atteignent le mur de paiement : les crédits gratuits ne s’épuisent pas (trop peu d’usage), pas un problème de prix.',
  checkout_started: 'Le mur de paiement ne convertit pas : prix, texte, confiance (reçu, annulation), ou bouton trop bas sur mobile.',
  checkout_completed: 'Le paiement échoue après démarrage : carte refusée, 3-D Secure, webhook Stripe — regarde les événements Stripe.',
};

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const quantile = (xs, q) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const countBy = (items, keyFn) => {
  const m = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (k == null) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
};

// Étape(s) de l'entonnoir déclenchée(s) par un événement.
function stepIndexesOf(ev) {
  const t = ev.event_type;
  const out = [];
  const i = FUNNEL.findIndex((s) => s.id === t);
  if (i >= 0) out.push(i);
  if (t === 'level_viewed') {
    const lvl = Number(ev.props && ev.props.level);
    if (lvl >= 2) out.push(FUNNEL.findIndex((s) => s.id === 'level_2'));
    if (lvl >= 3) out.push(FUNNEL.findIndex((s) => s.id === 'level_3'));
  }
  return out;
}

function sessionsOf(events) {
  const bySid = new Map();
  for (const ev of events) {
    if (!ev.sid) continue;
    if (!bySid.has(ev.sid)) bySid.set(ev.sid, []);
    bySid.get(ev.sid).push(ev);
  }
  for (const list of bySid.values()) list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return bySid;
}

function buildFunnel(sessions) {
  // « Atteint l'étape i » = a fait l'étape i OU une étape plus loin (un élève qui revient directement
  // sur l'outil ne passe pas par la page d'accueil) → entonnoir monotone, sans faux trous.
  const deepest = [];
  for (const list of sessions.values()) {
    let d = -1;
    for (const ev of list) for (const i of stepIndexesOf(ev)) d = Math.max(d, i);
    if (d >= 0) deepest.push(d);
  }
  const reached = FUNNEL.map((_, i) => deepest.filter((d) => d >= i).length);
  return FUNNEL.map((s, i) => ({
    id: s.id,
    label: s.label,
    sessions: reached[i],
    from_start_pct: pct(reached[i], reached[0]),
    from_prev_pct: i === 0 ? null : pct(reached[i], reached[i - 1]),
    lost: i === 0 ? 0 : Math.max(0, reached[i - 1] - reached[i]),
  }));
}

function buildMoney(sessions, events) {
  const has = (id) => {
    let n = 0;
    for (const list of sessions.values()) if (list.some((e) => e.event_type === id)) n += 1;
    return n;
  };
  const completed = events.filter((e) => e.event_type === 'checkout_completed').length; // côté serveur (pas de sid)
  const paywall = has('paywall_shown');
  const started = has('checkout_started');
  return [
    { id: 'paywall_shown', label: MONEY[0].label, sessions: paywall, from_prev_pct: null },
    { id: 'checkout_started', label: MONEY[1].label, sessions: started, from_prev_pct: pct(started, paywall) },
    { id: 'checkout_completed', label: MONEY[2].label, sessions: completed, from_prev_pct: pct(completed, started) },
  ];
}

function lastEvents(sessions) {
  const rows = [];
  for (const list of sessions.values()) {
    if (list.length === 0) continue;
    const last = list[list.length - 1];
    const label = last.event_type === 'level_viewed' ? `level_viewed_${(last.props && last.props.level) || '?'}` : last.event_type;
    rows.push(label);
  }
  const total = rows.length;
  return countBy(rows, (x) => x)
    .slice(0, 12)
    .map((r) => ({ last_event: r.key, sessions: r.n, share_pct: pct(r.n, total) }));
}

function segments(sessions, field) {
  const groups = new Map();
  for (const list of sessions.values()) {
    const first = list.find((e) => e[field]) || list[0];
    const key = (first && first[field]) || 'inconnu';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(list);
  }
  const idx = (id) => FUNNEL.findIndex((s) => s.id === id);
  return [...groups.entries()]
    .map(([key, lists]) => {
      const deep = lists.map((list) => {
        let d = -1;
        for (const ev of list) for (const i of stepIndexesOf(ev)) d = Math.max(d, i);
        return d;
      });
      const n = lists.length;
      const reach = (id) => deep.filter((d) => d >= idx(id)).length;
      return {
        key,
        sessions: n,
        cta_pct: pct(reach('cta_click'), n),
        connecte_pct: pct(reach('app_opened'), n),
        fiche_pct: pct(reach('analysis_success'), n),
      };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);
}

function errorsFrom(events) {
  const started = events.filter((e) => e.event_type === 'analysis_started').length;
  const analysisErrors = events.filter((e) => e.event_type === 'analysis_error');
  const clientErrors = events.filter((e) => e.event_type === 'client_error');
  return {
    analysis_started: started,
    analysis_error_total: analysisErrors.length,
    analysis_error_rate_pct: pct(analysisErrors.length, started),
    analysis_by_code: countBy(analysisErrors, (e) => (e.props && e.props.code) || 'inconnu').slice(0, 10),
    client_errors: countBy(clientErrors, (e) => `${(e.props && e.props.kind) || 'js'} · ${(e.props && e.props.msg) || '?'}`)
      .slice(0, 10)
      .map((r) => ({
        error: r.key,
        n: r.n,
        devices: [...new Set(clientErrors.filter((e) => `${(e.props && e.props.kind) || 'js'} · ${(e.props && e.props.msg) || '?'}` === r.key).map((e) => e.device).filter(Boolean))].slice(0, 3),
      })),
    login_errors: countBy(events.filter((e) => e.event_type === 'login_error'), (e) => (e.props && e.props.code) || 'inconnu').slice(0, 6),
  };
}

function engineFrom(rows) {
  const n = rows.length;
  const lat = rows.map((r) => Number(r.latency_ms)).filter((x) => Number.isFinite(x) && x > 0);
  const byKey = new Map();
  for (const r of rows) {
    const k = r.pattern_key;
    if (!k || k === 'autre/non-classe/non-classe') continue;
    if (!byKey.has(k)) byKey.set(k, { key: k, n: 0, bad: 0 });
    const g = byKey.get(k);
    g.n += 1;
    if (r.statut !== 'ok' || r.confiance === 'basse') g.bad += 1;
  }
  return {
    calls: n,
    ok_pct: pct(rows.filter((r) => r.statut === 'ok').length, n),
    incomplet_pct: pct(rows.filter((r) => r.statut === 'incomplet').length, n),
    erreur_pct: pct(rows.filter((r) => r.statut === 'erreur').length, n),
    latency_p50_ms: median(lat),
    latency_p95_ms: quantile(lat, 0.95),
    by_mode: countBy(rows, (r) => r.mode || 'inconnu'),
    by_model: countBy(rows, (r) => r.model || 'aucun'),
    by_error: countBy(rows.filter((r) => r.error_code), (r) => r.error_code).slice(0, 8),
    by_finish: countBy(rows, (r) => r.finish_reason || null),
    by_confiance: countBy(rows, (r) => r.confiance || null),
    worst_patterns: [...byKey.values()]
      .filter((g) => g.n >= 2 && g.bad > 0)
      .map((g) => ({ pattern_key: g.key, calls: g.n, bad_pct: pct(g.bad, g.n) }))
      .sort((a, b) => b.bad_pct - a.bad_pct)
      .slice(0, 8),
  };
}

const PAID = (plan) => plan && !['free', 'trial'].includes(plan);

function retentionFrom({ users, submissions, now, days }) {
  const DAY = 86400000;
  const subsByUser = new Map();
  for (const s of submissions) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id).push(new Date(s.created_at).getTime());
  }
  for (const list of subsByUser.values()) list.sort((a, b) => a - b);

  const cohortStart = now - days * DAY;
  const cohort = users.filter((u) => new Date(u.created_at).getTime() >= cohortStart);
  const firstDelayH = [];
  let activated = 0;
  let d1 = 0;
  let d7 = 0;
  let d1Eligible = 0;
  let d7Eligible = 0;
  for (const u of cohort) {
    const t0 = new Date(u.created_at).getTime();
    const subs = subsByUser.get(u.id) || [];
    if (subs.length) {
      activated += 1;
      firstDelayH.push(Math.round(((subs[0] - t0) / 3600000) * 10) / 10);
    }
    if (now - t0 >= 2 * DAY) {
      d1Eligible += 1;
      if (subs.some((t) => t - t0 >= DAY && t - t0 < 2 * DAY + DAY)) d1 += 1;
    }
    if (now - t0 >= 8 * DAY) {
      d7Eligible += 1;
      if (subs.some((t) => t - t0 >= 7 * DAY)) d7 += 1;
    }
  }

  const paid = users.filter((u) => PAID(u.plan));
  const lastSub = (u) => {
    const l = subsByUser.get(u.id);
    return l && l.length ? l[l.length - 1] : null;
  };
  const activeP = paid.filter((u) => lastSub(u) && now - lastSub(u) <= 7 * DAY).length;
  const dormant = paid.filter((u) => !(lastSub(u) && now - lastSub(u) <= 7 * DAY) && lastSub(u) && now - lastSub(u) <= 30 * DAY).length;
  const atRisk = paid.length - activeP - dormant;
  const expiringSoon = paid.filter((u) => u.plan_expires_at && new Date(u.plan_expires_at).getTime() > now && new Date(u.plan_expires_at).getTime() - now <= 7 * DAY).length;
  const churned = users.filter((u) => !PAID(u.plan) && u.plan_expires_at && new Date(u.plan_expires_at).getTime() <= now && now - new Date(u.plan_expires_at).getTime() <= days * DAY).length;
  const exhaustedFree = users.filter((u) => !PAID(u.plan) && Number(u.credits) === 0).length;

  const weeks = [];
  for (let w = 5; w >= 0; w -= 1) {
    const from = now - (w + 1) * 7 * DAY;
    const to = now - w * 7 * DAY;
    const c = users.filter((u) => {
      const t = new Date(u.created_at).getTime();
      return t >= from && t < to;
    });
    const act = c.filter((u) => (subsByUser.get(u.id) || []).length > 0).length;
    weeks.push({ week_start: new Date(from).toISOString().slice(0, 10), signups: c.length, activated_pct: pct(act, c.length) });
  }

  return {
    signups: cohort.length,
    activated: activated,
    activation_pct: pct(activated, cohort.length),
    first_analysis_median_h: median(firstDelayH),
    d1_pct: pct(d1, d1Eligible),
    d7_pct: pct(d7, d7Eligible),
    paid_total: paid.length,
    paid_active_7d: activeP,
    paid_dormant_8_30d: dormant,
    paid_inactive_30d_plus: atRisk,
    expiring_7d: expiringSoon,
    churned_in_window: churned,
    free_out_of_credits: exhaustedFree,
    weeks,
  };
}

// Essai sans compte : combien l'ouvrent, l'utilisent, reçoivent une fiche, puis s'inscrivent.
function guestFrom(sessions, events) {
  const has = (list, id) => list.some((e) => e.event_type === id);
  let opened = 0;
  let picked = 0;
  let started = 0;
  let success = 0;
  let clickedSignup = 0;
  let signedUpAfter = 0;
  for (const list of sessions.values()) {
    if (has(list, 'guest_open')) opened += 1;
    if (has(list, 'guest_file_selected')) picked += 1;
    if (has(list, 'guest_analysis_started')) started += 1;
    const ok = list.find((e) => e.event_type === 'guest_analysis_success');
    if (ok) {
      success += 1;
      if (list.some((e) => e.event_type === 'guest_signup_click')) clickedSignup += 1;
      const t0 = new Date(ok.created_at).getTime();
      if (list.some((e) => (e.event_type === 'signup_started' || e.event_type === 'app_opened') && new Date(e.created_at).getTime() >= t0)) signedUpAfter += 1;
    }
  }
  const errs = events.filter((e) => e.event_type === 'guest_analysis_error');
  return {
    opened,
    picked,
    started,
    success,
    errors: errs.length,
    errors_by_code: countBy(errs, (e) => (e.props && e.props.code) || 'inconnu').slice(0, 6),
    signup_click_pct: pct(clickedSignup, success),
    signed_up_after_pct: pct(signedUpAfter, success),
  };
}

function diagnose({ funnel, money, errors, engine, devices, retention, last, guest }) {
  const out = [];
  const add = (severity, title, evidence, fix) => out.push({ severity, title, evidence, fix });

  const top = funnel[0].sessions;
  if (top < 30) add('info', 'Trop peu de données', `${top} sessions seulement sur la période.`, 'Les pourcentages sont fragiles : attends plus de trafic avant de trancher.');

  // plus grosse fuite en nombre de sessions perdues (étapes avec assez de volume)
  const leaks = funnel
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => i > 0 && funnel[i - 1].sessions >= 10 && s.from_prev_pct != null)
    .filter(({ s }) => s.from_prev_pct < 90)
    .sort((a, b) => b.s.lost - a.s.lost); // l'impact d'abord : là où on perd le plus de monde
  if (leaks.length) {
    const w = leaks[0];
    const prev = funnel[w.i - 1];
    add(
      w.s.from_prev_pct < 40 ? 'high' : 'medium',
      `Plus grosse fuite : ${prev.label} → ${w.s.label}`,
      `Seulement ${w.s.from_prev_pct} % passent (${w.s.lost} sessions perdues sur ${prev.sessions}).`,
      FIX_HINTS[w.s.id] || 'Regarde ce qui se passe juste avant cette étape.',
    );
  }

  if (errors.analysis_error_rate_pct != null && errors.analysis_started >= 5 && errors.analysis_error_rate_pct >= 5) {
    const c = errors.analysis_by_code[0];
    add('high', 'Des analyses échouent', `${errors.analysis_error_rate_pct} % des analyses lancées finissent en erreur${c ? ` (surtout ${c.key})` : ''}.`, 'OCR_FAIL → guide photo (lumière, cadrage) ; AI_ERROR/502 → Gemini surchargé (modèles de repli) ; NO_CREDITS → vérifier l’affichage du mur de paiement.');
  }
  if (errors.client_errors.length) add('medium', 'Erreurs JavaScript chez les visiteurs', `${errors.client_errors[0].n}× « ${errors.client_errors[0].error} »`, 'Reproduis sur l’appareil indiqué ; une erreur de rendu peut bloquer silencieusement tout le parcours.');

  if (engine.calls >= 5) {
    if (engine.latency_p95_ms && engine.latency_p95_ms > 20000) add('high', 'Analyses très lentes', `95 % des analyses prennent moins de ${Math.round(engine.latency_p95_ms / 1000)} s, médiane ${Math.round((engine.latency_p50_ms || 0) / 1000)} s.`, 'Au-delà de ~15 s les élèves partent : vérifie la chaîne de modèles de repli, la taille des images, le prompt.');
    if ((engine.incomplet_pct || 0) >= 15) add('medium', 'Beaucoup de photos jugées incomplètes', `${engine.incomplet_pct} % des appels.`, 'Ajoute un guide photo avant l’envoi (lumière, une seule question, texte entier visible).');
    const fm = (engine.by_finish.find((f) => f.key === 'MAX_TOKENS') || {}).n;
    if (fm) add('high', 'Réponses coupées (MAX_TOKENS)', `${fm} appels.`, 'Monte maxOutputTokens ou raccourcis les niveaux.');
    if (engine.worst_patterns[0]) add('info', 'Types d’exercices les plus fragiles', engine.worst_patterns.slice(0, 3).map((p) => `${p.pattern_key} (${p.bad_pct} %)`).join(' · '), 'Ajoute des exemples de ce type dans le prompt ou des photos de test.');
  }

  const mobile = devices.find((d) => d.key === 'mobile');
  const desktop = devices.find((d) => d.key === 'desktop');
  if (mobile && desktop && mobile.sessions >= 15 && desktop.sessions >= 15 && mobile.connecte_pct != null && desktop.connecte_pct != null && mobile.connecte_pct < desktop.connecte_pct * 0.6) {
    add('medium', 'Le mobile convertit beaucoup moins que l’ordinateur', `Connecté : ${mobile.connecte_pct} % mobile contre ${desktop.connecte_pct} % ordinateur.`, 'Teste le parcours complet sur un vrai téléphone (clavier, lien magique ouvert dans un autre navigateur, taille des boutons).');
  }

  if (money[0].sessions >= 10 && money[1].from_prev_pct != null && money[1].from_prev_pct < 10) add('high', 'Le mur de paiement ne convertit pas', `${money[1].from_prev_pct} % des visiteurs du mur démarrent un paiement.`, FIX_HINTS.checkout_started);
  if (money[1].sessions >= 5 && money[2].from_prev_pct != null && money[2].from_prev_pct < 40) add('high', 'Des paiements démarrés n’aboutissent pas', `${money[2].from_prev_pct} % réussissent.`, FIX_HINTS.checkout_completed);
  if (funnel[7].sessions >= 10 && money[0].sessions === 0) add('info', 'Personne n’atteint le mur de paiement', 'Les crédits gratuits ne s’épuisent pas.', 'Le goulot est l’usage, pas le prix : travaille la rétention avant le paywall.');

  if (retention.signups >= 10) {
    if (retention.activation_pct != null && retention.activation_pct < 50) add('high', 'Des inscrits ne font jamais d’analyse', `${retention.activation_pct} % des nouveaux inscrits ont fait au moins une analyse.`, 'Après la connexion, amène à la photo en 1 clic (exemple, matière préchoisie) ; relance par courriel à 24 h.');
    if (retention.d7_pct != null && retention.d7_pct < 15) add('medium', 'Presque personne ne revient après 7 jours', `${retention.d7_pct} % reviennent.`, 'Rappel avant examen, série (flamme) mise en avant, courriel « tes fiches t’attendent ».');
  }
  if (retention.paid_total >= 3 && retention.paid_inactive_30d_plus / retention.paid_total > 0.3) add('high', 'Risque de churn : abonnés inactifs', `${retention.paid_inactive_30d_plus} abonnés sur ${retention.paid_total} sans analyse depuis 30 jours.`, 'Courriel de réactivation + vérifier ce qu’ils ont fait avant de partir (dernier événement).');

  const lastTop = last[0];
  if (lastTop && lastTop.share_pct >= 40 && lastTop.last_event !== 'pageview') add('info', 'Dernier point de contact le plus fréquent', `${lastTop.share_pct} % des sessions finissent sur « ${lastTop.last_event} ».`, 'C’est là que les gens s’arrêtent : lis l’étape correspondante.');

  if (guest && guest.opened >= 5) {
    if (guest.picked < guest.opened * 0.4) add('medium', "Les gens ouvrent l'essai mais ne choisissent pas de photo", `${guest.picked} photos pour ${guest.opened} ouvertures.`, "La zone de dépôt n'est pas claire ou ils n'ont pas de devoir sous la main : ajoute un exemple en un clic.");
    if (guest.started >= 5 && guest.success / guest.started < 0.7) add('high', "L'essai sans compte échoue trop souvent", `${guest.success} fiches pour ${guest.started} essais (${guest.errors} erreurs).`, "Regarde les codes d'erreur : photo illisible, limite atteinte ou panne Gemini.");
    if (guest.success >= 5 && guest.signed_up_after_pct != null && guest.signed_up_after_pct < 20) add('high', "Les essayeurs voient la valeur mais ne créent pas de compte", `Seulement ${guest.signed_up_after_pct} % s'inscrivent après avoir reçu une fiche.`, "Rends l'offre de compte plus claire (ce qu'ils gagnent : 3 analyses, bibliothèque) et mets le bouton plus haut sur la fiche.");
  }

  const order = { high: 0, medium: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

function analyze({ events = [], engine = [], users = [], submissions = [], now = Date.now(), days = 30 }) {
  const sessions = sessionsOf(events);
  const funnel = buildFunnel(sessions);
  const money = buildMoney(sessions, events);
  const last = lastEvents(sessions);
  const devices = segments(sessions, 'device');
  const errors = errorsFrom(events);
  const eng = engineFrom(engine);
  const retention = retentionFrom({ users, submissions, now, days });
  const guest = guestFrom(sessions, events);
  const perDay = new Map();
  for (const ev of events) {
    if (ev.event_type !== 'pageview') continue;
    const day = String(ev.created_at).slice(0, 10);
    perDay.set(day, (perDay.get(day) || 0) + 1);
  }
  return {
    generated_at: new Date(now).toISOString(),
    days,
    sessions: sessions.size,
    events: events.length,
    funnel,
    money,
    last_events: last,
    devices,
    sources: segments(sessions, 'source'),
    regions: segments(sessions, 'region'),
    pageviews_per_day: [...perDay.entries()].sort().map(([day, n]) => ({ day, n })),
    errors,
    engine: eng,
    retention,
    guest,
    diagnostics: diagnose({ funnel, money, errors, engine: eng, devices, retention, last, guest }),
  };
}

module.exports = { analyze, FUNNEL, MONEY, FIX_HINTS, pct, median, quantile };
