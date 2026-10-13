# Briefing technique RPVD (à donner à Claude)

État au 2026-10-13. Prompt à coller dans une nouvelle conversation.

````
CONTEXTE : RPVD (rpvdsuccess.com)

Tu travailles sur RPVD, un business québécois de tutorat par capsules vidéo, fondé par Abdel-Majid (Majid) et Ismaël Messaoudi. Lis PROJECT_HANDOFF.md (historique technique) et README.md (état actuel) avant d'agir.
Repo : github.com/amharokad-code/rpvd-success. Branche de travail : claude/task-hfqwss (commits non poussés, rien n'est déployé).

== RÈGLES DE TRAVAIL ==
- Exécute, ne discute pas (mode BNSL : MVP fonctionnel d'abord, finition ensuite). Pose une question seulement pour une valeur réelle manquante (prix, clé, URL, texte final). N'invente jamais une valeur.
- Concept gelé jusqu'au 1er janvier 2027. Aucune idée parallèle ni refonte. Refuse ce qui sort du cadre.
- Jamais de clé, de token ni de secret dans le chat, les logs ou le dépôt. Variables d'env : demande la valeur, l'utilisateur la pose avec `npx netlify env:set`.
- Ne déploie pas en production sans demande explicite. Ne crée aucun produit Stripe sans confirmation.
- Commits petits et séparés. À la fin d'une étape : ce qui marche, comment tester, ce qui manque. Rapporte fidèlement ce qui n'est pas vérifié.
- Ne touche pas au Moteur D ni à la PWA (paywall, crédits). N'ajoute aucune fonctionnalité PWA.

== LE BUSINESS ==
Client = le PARENT. Bénéficiaire = parent + élève (secondaire 1-5 et cégep, Québec ; priorité maths et sciences, ex. SN4). Message central : la tranquillité d'esprit du parent. Méthode RPVD : même démarche pour tous les numéros d'un même type d'exercice, seuls les chiffres et le contexte changent.

3 produits, CAD, paiement unique :
1. Capsule Concept : vidéo sous-titrée, méthode sur un concept.
2. Capsule Examen : produit phare, plus longue, liée à un type d'examen. Inclut un code d'essai PWA de 30 jours.
3. Bootcamp RPVD en direct : séance live, questions en direct, essai PWA 30 jours, clavardage jusqu'à l'examen (groupe WhatsApp/Discord). 25 places max par session.
Prix actuels dans le code : 24 $ / 29 $ / 99 $. EN ATTENTE de confirmation : tarification de lancement (Concept 24 $ puis 37 $ ; Examen 37 $ puis 50 $ ; fin du lancement 2027-01-01T00:00:00-05:00, America/Toronto). Règle : aucun prix barré, aucun pourcentage de rabais, aucun compte à rebours, aucun badge « offre limitée », date de fin affichée une fois, factuellement. À faire : src/config/pricing.js unique + copie serveur ; prix actif choisi côté serveur au checkout (price_data, pas de price_id) ; mention des taxes (TPS/TVQ) selon la config Stripe réelle.
La PWA existante (outil d'analyse /app, abonnements Basic/Pro, Moteur D, Gemini) reste un bonus de fidélisation, intacte.

== STACK ==
React 19 + Vite + Tailwind v4 ; Netlify Functions (Node, CommonJS) ; Supabase (Postgres + RLS + Auth lien magique) ; Stripe Checkout ; Resend (courriels) ; VdoCipher (vidéo DRM) ; Cloudflare Turnstile (anti-robots). Site réel : rpvdsuccess.netlify.app / rpvdsuccess.com (déploiement auto sur push main). rpvd-success-v2 est un ancien site bloqué : ne pas l'utiliser sans confirmation de l'ID du site.

== CE QUI EST CONSTRUIT (code écrit, build et 102 tests verts, jamais testé en conditions réelles) ==
Pages : `/` landing parents (3 produits, Examen « Recommandé », vidéo démo via VITE_DEMO_VIDEO_URL, sondage, catalogue) ; `/capsules` mini magasin (couverture, filtres matière/niveau, Examen en tête, « X parents l'ont demandée » = vrai compteur) ; `/capsules/:slug` fiche publique (jamais la vidéo) + achat ; `/demande` ; `/connexion` ; `/mes-capsules` ; `/capsule/:slug` parcours élève ; `/suivi` vue parent lecture seule ; `/admin` ; `/bootcamp` et `/vote` (ancien produit hebdomadaire) ; `/app` (PWA).
Sondage de demande : 1 question par écran, avance au clic, barre de progression, sauvegarde locale, courriel + prénom + consentement UNIQUEMENT à l'écran final, Turnstile + honeypot. Insère dans capsule_requests. Règle : ≥ 3 demandes d'un même sujet = on produit la capsule.
Achat : fiche → cases (attestation parent/tuteur OBLIGATOIRE, Loi 25 ; courriels de suivi FACULTATIFS, décochés, LCAP) → Stripe Checkout CAD → webhook (signature vérifiée, idempotent par session) crée orders, un code d'essai PWA (Examen/Bootcamp), et envoie un lien magique à usage unique. Litige ou remboursement (charge.dispute.created, charge.refunded) → orders.status = revoked.
Accès : session Supabase, accès à vie, visionnement illimité, 2 appareils max par courriel (capsule_devices). Jeton de lecture VdoCipher neuf à chaque visionnement (DRM, filigrane dynamique courriel + date, filigrane fixe texte « RPVD », pas de téléchargement, aucune URL vidéo brute). Limite connue : aucun web ne bloque totalement la capture d'écran ; le filigrane est la dissuasion.
Parcours d'engagement : capsule = segments de 5 à 8 min (un type de numéro chacun), segment 1 « Commence ici », mini-exercice + « J'ai essayé » puis correction RPVD, complété à 90 % vu, compte à rebours vers la VRAIE date d'examen (capsules.date_examen), plan suggéré. Progression envoyée au serveur (watch_progress, un élève par achat).
Courriels (Netlify Scheduled Functions, 1x/jour) : capsule-cron (demandes : « prête », J-3 si exam_date réelle, J-1 optionnel via CAPSULE_J1_ENABLED, lendemain d'examen ; stop si achat/désabonné) ; engagement-cron (au parent : J+1 non commencé, progression, J-3, fin, invitation Bootcamp à J-5 sous 50 %). Seulement si consentement coché ; chaque courriel a identité + adresse postale + désabonnement fonctionnel (email_events / engagement_events empêchent les doublons).
Admin (/admin, ADMIN_EMAILS vérifié côté serveur) : demandes par sujet, capsules (couverture, VdoCipher, date d'examen, publication), segments, commandes, création de bootcamp (≤ 25), mesures (démarrage 24 h, complétion, segment de décrochage, exercices tentés).
SEO / visibilité IA : robots.txt (bots IA autorisés, pages privées exclues), llms.txt, sitemap dynamique, fiches pré-rendues avec JSON-LD Course + Offer (fonction seo.js), noindex sur pages privées, aucun GA/pixel sur pages vidéo et suivi.
Sécurité : RLS sur toutes les tables (test automatisé), `npm run audit:dist` (aucune clé dans le bundle), npm audit à 0, limites lien magique 3/h/courriel et 10/h/IP.
Légal (Loi 25, LCAP, LPC) : mentions de suivi mineurs et de filigrane dans la politique de confidentialité ; aucune fausse urgence.

== MODÈLE DE DONNÉES (supabase_schema.sql, idempotent) ==
capsules (= products), capsule_segments, orders (= purchases : status, parent_attested_at, consentement_courriels), watch_progress, bootcamps (≤ 25 places), capsule_requests, capsule_devices, email_events, engagement_events, email_optouts ; vue capsule_demand. L'ancienne table bootcamp_sessions est l'ancien produit hebdomadaire (schéma différent).

== À FAIRE PAR L'UTILISATEUR (bloquant) ==
- Rotation des clés exposées : Supabase service_role, Gemini, Stripe (secrète + secret de webhook), jeton Netlify ; 2FA sur Stripe, Supabase, Netlify, Google, VdoCipher, GitHub, Resend ; SPF/DKIM/DMARC ; sauvegardes Supabase ; session 90 jours ; URL de redirection /mes-capsules dans Supabase Auth.
- Stripe : ajouter charge.dispute.created et charge.refunded au webhook ; désactiver le webhook Supabase Edge parasite (100 % d'erreur).
- Variables Netlify : ADMIN_EMAILS, VDOCIPHER_API_SECRET, TURNSTILE_SECRET_KEY, VITE_TURNSTILE_SITE_KEY, VITE_DEMO_VIDEO_URL (+ existantes : Supabase, Stripe, Resend, URL).
- Rejouer supabase_schema.sql dans Supabase.
- Contenu : vidéo démo 3-5 min, 1re capsule Examen SN4 sous-titrée (segments dans VdoCipher), gabarit de couverture Canva, textes finaux de la landing (actuellement brouillons), liste des 30 premiers parents (réseau E.M.A.), politique de remboursement des capsules (la page actuelle ne couvre que l'ancien Bootcamp 20 $), adresse postale légale (postalAddress dans src/legal/business.json), détails du bootcamp (dates, capacité, outil live, groupe de clavardage).

== LIMITES NON VÉRIFIÉES (dis-les, ne les cache pas) ==
API VdoPlayer (lecture de currentTime) et génération auto des sous-titres non validées avec la doc actuelle ; filigrane fixe = texte, pas logo ; compteur « X parents l'ont demandée » jamais vu à l'écran ; aucun test réel contre Supabase/Stripe/Resend/VdoCipher ; parcours 4242 → segment 1 → exercice → courriel parent jamais exécuté ; liens magiques parfois consommés par les scanners de courriel (/connexion renvoie un nouveau lien) ; remboursement ne révoque pas le code PWA déjà envoyé.

== PROCHAINES ÉTAPES ==
1. Confirmer la tarification de lancement (Examen 29 $ → 37 $ ? taxes incluses ou en sus ?) puis l'implémenter.
2. Après rotation des clés + SQL + variables : déployer sur le BON site Netlify (ID à confirmer), puis test réel complet.
3. Produire la première capsule et lancer les 30 appels/parents en parallèle du code.
````
