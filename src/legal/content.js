// Textes légaux statiques (compilés dans le bundle, jamais chargés depuis Supabase).
// fr = Québec/France, en = US/UK. Format simple : '## ' = titre, '### ' = sous-titre, '- ' = liste,
// sinon paragraphe. Identité du commerçant : src/legal/business.json (source unique, aussi lue par le serveur).

import BUSINESS from './business.json'

const UPDATED = '5 octobre 2026'
const UPDATED_EN = 'October 5, 2026'
const SUPPORT_EMAIL = BUSINESS.email

const WHERE = BUSINESS.postalAddress || BUSINESS.city

export const PRIVACY_POLICY = {
  fr: `## Politique de confidentialité
Dernière mise à jour : ${BUSINESS.updated}

RPVD Success (« RPVD », « nous ») est exploité par ${BUSINESS.operator}, ${BUSINESS.city}. Notre règle est simple : on ne collecte que ce qui est indispensable pour te rendre le service, rien de plus. Cette politique explique quoi, pourquoi, combien de temps, et comment exercer tes droits.

## Responsable de la protection des renseignements personnels
- ${BUSINESS.privacyOfficerTitle}
- Courriel : ${BUSINESS.email}
- Adresse : ${WHERE}
- Cette personne veille à l'application de la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25) et traite toute demande ou plainte.

## Ce qu'on ne te demande jamais
- Ton nom ou ton prénom
- Ton âge ou ta date de naissance
- Ton adresse, ton numéro de téléphone ou ton école
- Ta photo ou ta caméra : pendant les cours en direct, la caméra des élèves est désactivée

## Bootcamp RPVD : ce qu'on collecte et pourquoi
- Vote : ton courriel, ton niveau, ta matière et le sujet choisi (plus ta précision si tu choisis « Autre sujet »). Pour compter les votes, t'envoyer le résultat et les annonces de sessions.
- Consentement : la date à laquelle tu as coché les cases du formulaire, comme preuve de ton consentement.
- Provenance : le nom de la publication ou de la campagne qui t'a amené (par exemple « tiktok » ou le nom d'une annonce), gardé avec ton vote ou ton billet. Aucun identifiant publicitaire n'est enregistré dans notre base de données.
- Billet : ton courriel, le montant, l'état du billet et les références de paiement Stripe. Pour confirmer ta place, t'envoyer ton lien Zoom, te rembourser si tu le demandes et tenir notre comptabilité.
- Paiement : il se fait chez Stripe. Nous ne voyons jamais le numéro de carte. Stripe peut demander le nom du titulaire de la carte pour traiter le paiement ; nous ne le conservons pas.
- Cours sur Zoom : ton courriel est transmis à Zoom uniquement pour créer ton lien personnel. Tu apparais comme « Élève » suivi d'un code. Caméra désactivée, micro coupé (ouvert seulement quand l'animateur te donne la parole), aucun enregistrement du cours par RPVD, messages privés entre élèves désactivés.
- Sécurité : une empreinte irréversible (hachage) de l'adresse IP sert à bloquer les abus (trop de requêtes en une heure). Elle n'est jamais associée à ton vote ni à ton billet et elle est effacée au plus tard 7 jours après.

## Outil d'analyse (/app) : ce qu'on collecte et pourquoi
- Ton courriel, au moment où tu te connectes (lien magique, aucun mot de passe) ou payes.
- Une empreinte technique de ton appareil (résolution, fuseau horaire, navigateur) pour empêcher le partage d'un même compte entre plusieurs personnes.
- Les photos d'exercices que tu envoies : transmises à Google Gemini pour générer l'analyse pédagogique, jamais écrites sur nos serveurs. Seule l'analyse textuelle est conservée dans ton compte.
- L'IA peut se tromper. Aucune décision automatisée n'affecte tes droits : l'analyse est un outil d'étude, jamais un verdict. Tu peux demander une révision humaine d'une erreur reproductible à ${BUSINESS.email}.
- Les métadonnées de paiement de ton abonnement (via Stripe).

## Élèves mineurs
- 14 ans et plus : au Québec, tu peux consentir toi-même à la collecte de ton courriel.
- Moins de 14 ans : c'est un parent ou un tuteur qui consent. Pour le vote, le parent remplit le formulaire (idéalement avec son propre courriel). Une case du formulaire le confirme : on ne te demande pas ton âge.
- Billets : le paiement est fait par un adulte (parent, tuteur ou élève de 18 ans et plus).
- Outil d'analyse : une simple question (oui ou non) vérifie le seuil d'âge de ton marché avant la première utilisation (Québec : 14 ans ; France : 15 ans ; Royaume-Uni et États-Unis : 13 ans, accès bloqué sans consentement parental vérifiable).
- Nous ne faisons aucune publicité destinée aux enfants de moins de 13 ans.

## Courriels
- Courriels liés à ta demande ou à ton billet (confirmation de vote, confirmation de réservation, lien Zoom, remboursement) : envoyés parce qu'ils sont nécessaires au service.
- Annonces (sujet sélectionné, places libérées, suivi après le cours) : seulement avec ton consentement, donné en cochant la case du formulaire ou découlant de ton achat. Chaque annonce contient un lien « Ne plus recevoir les annonces », appliqué immédiatement.
- Chaque courriel identifie l'expéditeur : ${BUSINESS.operator}, ${WHERE}, ${BUSINESS.email}.

## Durée de conservation
- Votes : supprimés automatiquement 6 mois après la semaine du vote.
- Billets : courriel et lien Zoom effacés automatiquement 6 mois après l'achat. Le montant, la date et la référence de paiement sont gardés 6 ans pour nos obligations comptables et fiscales.
- Liste de désabonnement : conservée tant que nécessaire pour respecter ton choix.
- Compte de l'outil d'analyse : jusqu'à ce que tu le supprimes (Réglages) ou que tu en fasses la demande.

## Mesure de nos publicités (Meta et Snapchat)
Nous faisons de la publicité sur Instagram et Facebook (Meta) et sur Snapchat (Snap). Pour savoir si elle fonctionne, nous utilisons deux outils, chacun avec son propre consentement. Les deux sont facultatifs : refuser ne change rien à ta réservation ni à ton accès.
- Pixels dans ton navigateur (Meta Pixel, Snap Pixel). Chargés SEULEMENT si tu cliques « Tout accepter » dans le bandeau de témoins. Ils ne tournent que sur la page d'accueil, le vote, la réservation, la confirmation d'achat et la présentation de la méthode, jamais sur les pages dont l'adresse contient un identifiant personnel (remboursement, désabonnement, administration, outil d'analyse). Ils reçoivent des événements (page vue, vote envoyé, début du paiement, achat avec le montant de 20 $ CAD), jamais ton courriel ni ton nom. Meta et Snap y associent leurs propres témoins (par exemple _fbp, _fbc, _scid) et voient l'adresse IP de ton appareil, selon leurs propres politiques.
- Confirmation d'achat envoyée depuis notre serveur (API de conversions de Meta et de Snap). Seulement si tu coches, sur la page de réservation, la case facultative prévue à cet effet (jamais cochée d'avance). Après ton paiement, nous transmettons alors à Meta et à Snap : le montant et la devise, l'heure de l'achat, ton courriel sous forme hachée (empreinte irréversible calculée sur notre serveur : ton courriel lui-même n'est pas envoyé), l'adresse IP et le type de navigateur de ton appareil, ainsi que, si tu en avais, l'identifiant du clic sur la publicité (fbclid, ScCid) et les témoins Meta et Snap. Ces renseignements sont inscrits dans les métadonnées de ton paiement chez Stripe pour pouvoir être transmis, et y restent attachés tant que Stripe conserve ce paiement. Sans la case cochée, rien n'est envoyé et rien de cela n'est enregistré.
- Provenance de la publicité : le nom de la campagne qui t'a amené (paramètres « src » et « utm ») est gardé avec ton vote ou ton billet. Ce sont des étiquettes sans lien avec ta personne.
- Pourquoi : mesurer combien de personnes ont voté ou réservé grâce à une publicité, pour décider quoi garder ou arrêter. Fondement : ton consentement (Loi 25). Meta et Snap sont des entreprises américaines : ces renseignements sont donc traités hors du Québec.
- Retirer ton consentement : lien « Gérer mes cookies » au bas des pages du Bootcamp. Les pixels cessent aussitôt d'envoyer des événements et nous supprimons les témoins Meta et Snap de ce site. La confirmation d'achat depuis notre serveur a lieu une seule fois, juste après le paiement : si tu changes d'avis ensuite, écris à ${BUSINESS.email}. Nous ne pouvons pas rappeler ce qui a déjà été transmis, mais tu peux aussi demander à Meta et à Snap de supprimer ces données depuis les paramètres de ton compte sur leurs plateformes.
- Nos publicités s'adressent aux 14 ans et plus et aux parents, jamais aux enfants de moins de 13 ans.

## Fournisseurs et hébergement hors du Québec
Certains fournisseurs hébergent des renseignements à l'extérieur du Québec, notamment aux États-Unis. Avant de leur en confier, nous évaluons les facteurs relatifs à la vie privée et nous leur transmettons le strict minimum.
- Supabase : base de données et connexion
- Netlify : hébergement du site et fonctions serveur
- Stripe : paiements
- Resend : envoi des courriels
- Zoom : cours en direct (courriel et nom affiché « Élève » seulement)
- Google Gemini : analyse des photos d'exercices (outil d'analyse seulement)
- Google Analytics : statistiques de visite, seulement si tu cliques « Tout accepter » dans le bandeau de cookies.
- Meta (Instagram, Facebook) : pixel du navigateur (seulement si tu cliques « Tout accepter ») et API de conversions (seulement si tu coches la case de la page de réservation). Voir « Mesure de nos publicités ».
- Snap (Snapchat) : pixel et API de conversions, avec les mêmes consentements que Meta.

## Sécurité
- Connexion chiffrée (HTTPS) partout.
- Base de données fermée au public : seules nos fonctions serveur y accèdent.
- Liens de gestion (remboursement, désabonnement) protégés par des identifiants aléatoires impossibles à deviner, sans aucun courriel dans l'adresse.
- Accès aux données réservé aux fondateurs, pour les seules finalités décrites ici.

## Tes droits
- Accéder à tes renseignements et en recevoir une copie dans un format technologique courant.
- Les faire corriger.
- Les faire supprimer et retirer ton consentement (pour les annonces : un clic dans n'importe quel courriel).
- Porter plainte : d'abord auprès de nous, puis auprès de la Commission d'accès à l'information du Québec (cai.gouv.qc.ca).
- Pour exercer un droit : formulaire /legal/contact ou ${BUSINESS.email}. Réponse dans un délai de 30 jours.

## Incidents de confidentialité
Nous tenons un registre des incidents de confidentialité. Si un incident présente un risque de préjudice sérieux, nous avisons sans délai la Commission d'accès à l'information et les personnes concernées (et, pour les utilisateurs européens, la CNIL ou l'ICO dans les délais prévus).

## Gouvernance
- Le responsable de la protection des renseignements personnels approuve ces pratiques et les révise au moins une fois par année.
- Toute personne qui accède aux données (fondateurs, animateurs) s'engage à la confidentialité.
- Tout nouveau projet qui traite des renseignements personnels fait d'abord l'objet d'une évaluation des facteurs relatifs à la vie privée.
- Les plaintes sont traitées par le responsable dans un délai de 30 jours.

## Modifications
Toute modification est publiée sur cette page avec sa date. Si elle change ce qu'on fait de tes renseignements, nous te demandons ton consentement à nouveau.

## Contact
${BUSINESS.operator} · ${WHERE} · ${BUSINESS.email}`,
  en: `## Privacy Policy
Last updated: ${BUSINESS.updatedEn}

RPVD Success ("RPVD", "we") is operated by ${BUSINESS.operator}, ${BUSINESS.city}. Our rule is simple: we only collect what is essential to provide the service. This policy explains what, why, for how long, and how to exercise your rights.

## Person in charge of personal information
- ${BUSINESS.privacyOfficerTitle}
- Email: ${BUSINESS.email}
- Address: ${WHERE}
- This person oversees compliance with Quebec's Act respecting the protection of personal information in the private sector (Law 25) and handles every request or complaint.

## What we never ask for
- Your first or last name
- Your age or date of birth
- Your address, phone number or school
- Your photo or your camera: during live classes, students' cameras are turned off

## RPVD Bootcamp: what we collect and why
- Vote: your email, grade, subject and chosen topic (plus your detail if you pick "Other topic"). To count votes and send you the result and session announcements.
- Consent: the date you ticked the form's boxes, as proof of consent.
- Source: the name of the post or campaign that brought you (e.g. "tiktok" or an ad's name), kept with your vote or ticket. No advertising identifier is stored in our database.
- Ticket: your email, amount, ticket status and Stripe payment references. To confirm your seat, send your Zoom link, refund you on request and keep our accounts.
- Payment: handled by Stripe. We never see the card number. Stripe may ask for the cardholder's name to process the payment; we do not keep it.
- Zoom classes: your email is sent to Zoom only to create your personal link. You appear as "Élève" (student) plus a code. Camera off, microphone muted (opened only when the instructor gives you the floor), no recording by RPVD, private messages between students disabled.
- Security: an irreversible fingerprint (hash) of the IP address is used to block abuse (too many requests within an hour). It is never linked to your vote or ticket and is erased within 7 days.

## Analysis tool (/app): what we collect and why
- Your email, when you sign in (magic link, no password) or pay.
- A technical fingerprint of your device (screen, timezone, browser) to prevent account sharing.
- Exercise photos you send: forwarded to Google Gemini to generate the analysis, never written to our servers. Only the text analysis is kept in your account.
- The AI can make mistakes. No automated decision affects your rights. You can request a human review of a reproducible error at ${BUSINESS.email}.
- Payment metadata for your subscription (via Stripe).

## Minors
- 14 and over: in Quebec, you can consent yourself to the collection of your email.
- Under 14: a parent or guardian consents. For voting, the parent fills in the form (ideally with their own email). A checkbox confirms it: we do not ask your age.
- Tickets: payment is made by an adult (parent, guardian or student aged 18+).
- Analysis tool: a simple yes/no question checks your market's age threshold before first use (Quebec: 14; France: 15; UK and US: 13, access blocked without verifiable parental consent).
- We do not advertise to children under 13.

## Emails
- Emails tied to your request or ticket (vote confirmation, booking confirmation, Zoom link, refund) are sent because they are necessary.
- Announcements (selected topic, released seats, after-class follow-up) only with your consent. Every announcement includes an "Unsubscribe from announcements" link, applied immediately.
- Every email identifies the sender: ${BUSINESS.operator}, ${WHERE}, ${BUSINESS.email}.

## Retention
- Votes: automatically deleted 6 months after the voting week.
- Tickets: email and Zoom link automatically erased 6 months after purchase. Amount, date and payment reference are kept 6 years for accounting and tax obligations.
- Unsubscribe list: kept as long as needed to honour your choice.
- Analysis tool account: until you delete it (Settings) or ask us to.

## Ad measurement (Meta and Snapchat)
We advertise on Instagram and Facebook (Meta) and on Snapchat (Snap). To know whether our ads work, we use two tools, each with its own consent. Both are optional: declining changes nothing about your booking or access.
- Browser pixels (Meta Pixel, Snap Pixel). Loaded ONLY if you click "Accept all" in the cookie banner. They run only on the home page, the vote, the booking page, the purchase confirmation and the method presentation, never on pages whose address contains a personal identifier (refund, unsubscribe, admin, analysis tool). They receive events (page view, vote sent, checkout started, purchase with the CAD $20 amount), never your email or name. Meta and Snap attach their own cookies (e.g. _fbp, _fbc, _scid) and see your device's IP address, under their own policies.
- Purchase confirmation sent from our server (Meta and Snap Conversions APIs). Only if you tick the optional box on the booking page (never pre-ticked). After your payment we then send Meta and Snap: the amount and currency, the purchase time, your email in hashed form (an irreversible fingerprint computed on our server: the email itself is not sent), your device's IP address and browser type, and, if you had them, the ad click identifier (fbclid, ScCid) and the Meta and Snap cookies. This information is written into your payment's metadata at Stripe so it can be sent, and stays attached to that payment for as long as Stripe keeps it. Without the box ticked, nothing is sent and none of it is recorded.
- Ad source: the name of the campaign that brought you (the "src" and "utm" parameters) is kept with your vote or ticket. These are labels with no link to you as a person.
- Why: to measure how many people voted or booked thanks to an ad, and decide what to keep or stop. Basis: your consent (Law 25). Meta and Snap are US companies: this information is therefore processed outside Quebec.
- Withdrawing consent: the "Gérer mes cookies" link ("Manage my cookies") at the bottom of the Bootcamp pages. The pixels stop sending events at once and we delete the Meta and Snap cookies of this site. The server-side purchase confirmation happens once, right after payment: if you change your mind afterwards, write to ${BUSINESS.email}. We cannot recall what has already been sent, but you can also ask Meta and Snap to delete this data from your account settings on their platforms.
- Our ads are aimed at ages 14 and over and at parents, never at children under 13.

## Providers and hosting outside Quebec
Some providers host information outside Quebec, notably in the United States. Before entrusting them with any, we assess privacy factors and send only the strict minimum.
- Supabase: database and sign-in
- Netlify: website hosting and server functions
- Stripe: payments
- Resend: email delivery
- Zoom: live classes (email and display name "Élève" only)
- Google Gemini: exercise photo analysis (analysis tool only)
- Google Analytics: visit statistics, only if you click "Accept all" in the cookie banner.
- Meta (Instagram, Facebook): browser pixel (only if you click "Accept all") and Conversions API (only if you tick the box on the booking page). See "Ad measurement".
- Snap (Snapchat): pixel and Conversions API, with the same consents as Meta.

## Security
- Encrypted connection (HTTPS) everywhere.
- Database closed to the public: only our server functions can reach it.
- Management links (refund, unsubscribe) protected by unguessable random identifiers, with no email in the address.
- Data access limited to the founders, for the purposes described here only.

## Your rights
- Access your information and receive a copy in a commonly used technological format.
- Have it corrected.
- Have it deleted and withdraw your consent (for announcements: one click in any email).
- Complain: first to us, then to Quebec's Commission d'accès à l'information (cai.gouv.qc.ca).
- To exercise a right: form at /legal/contact or ${BUSINESS.email}. Answer within 30 days.

## Privacy incidents
We keep a register of privacy incidents. If an incident presents a risk of serious injury, we promptly notify the Commission d'accès à l'information and the people concerned (and, for European users, the CNIL or ICO within the required timeframes).

## Governance
- The person in charge of personal information approves these practices and reviews them at least once a year.
- Anyone with data access (founders, instructors) is bound by confidentiality.
- Any new project handling personal information first goes through a privacy impact assessment.
- Complaints are handled by the person in charge within 30 days.

## Changes
Any change is published on this page with its date. If it changes what we do with your information, we ask for your consent again.

## Contact
${BUSINESS.operator} · ${WHERE} · ${BUSINESS.email}`,
}

export const TERMS_OF_SERVICE = {
  fr: `## Conditions d'utilisation
Dernière mise à jour : ${BUSINESS.updated}

Ces conditions encadrent l'utilisation du site ${BUSINESS.website}, du Bootcamp RPVD et de l'outil d'analyse. En réservant une place ou en utilisant le site, tu les acceptes. Rien dans ces conditions ne limite les droits que te reconnaît la Loi sur la protection du consommateur du Québec.

## Le commerçant
- ${BUSINESS.operator}
- ${WHERE}
- ${BUSINESS.email}
- ${BUSINESS.website}

## Bootcamp RPVD : le service
- Une session de révision de 1 h 30 en direct sur Zoom (1 h de démarche, puis 30 minutes de questions), un dimanche, sur un sujet choisi par le vote des élèves.
- Le sujet, la date, l'heure, la durée, le prix et le nombre de places sont affichés avant le paiement et repris dans le courriel de confirmation, qui est ta copie du contrat.
- Le Bootcamp est un service privé, indépendant du ministère de l'Éducation et des écoles.

## Bootcamp RPVD : prix et paiement
- 20,00 $ CAD par billet, tout inclus : aucun frais ni taxe ne s'ajoute au montant affiché.
- Paiement unique par carte, via Stripe, au moment de la réservation. Pas d'abonnement, pas de paiement fractionné, aucun intérêt ni frais de retard.
- Le paiement est fait par un adulte : parent, tuteur ou élève de 18 ans et plus.

## Bootcamp RPVD : remboursement et annulation
- Remboursement intégral sur simple demande jusqu'au samedi 23 h 59 (heure du Québec) précédant la session, en un clic depuis le courriel de confirmation.
- Aucun remboursement le dimanche, jour du cours, y compris pour les places libérées vendues ce jour-là.
- Si RPVD annule la session ou ne peut pas la donner à cause d'un problème de notre côté, tu es remboursé intégralement et automatiquement.

## Bootcamp RPVD : accès au cours
- Ton lien Zoom personnel arrive par courriel 30 à 60 minutes avant le début. Il fonctionne sur un seul appareil à la fois et ne se partage pas.
- Prévois une connexion internet et un appareil fonctionnels : un problème de ton côté après la date limite de remboursement ne donne pas droit à un remboursement.

## Règles de la classe
- Caméras des élèves désactivées. Micros coupés, ouverts uniquement quand l'animateur donne la parole.
- Le nom affiché par défaut est « Élève » suivi d'un code. Si tu le changes, utilise ton prénom ou un pseudonyme respectueux.
- Questions dans le chat, avec respect. Aucun propos haineux, harcelant, sexuel ou violent, aucune publicité.
- Ne donne jamais tes coordonnées (téléphone, réseaux sociaux, adresse) dans le chat. Les messages privés entre élèves sont désactivés.
- Aucun enregistrement, aucune capture d'écran, aucune rediffusion du cours ni des documents.
- Un élève qui enfreint gravement ces règles peut être retiré de la session, sans remboursement de cette session.

## Ce qu'on promet, et ce qu'on ne promet pas
- Nous enseignons des démarches de résolution et les pièges fréquents des évaluations, étape par étape.
- Nous ne garantissons aucune note ni aucun résultat scolaire : la réussite dépend aussi de ton travail.
- Le contenu (démarches, exercices, fiches) est réservé à ton usage personnel d'étude : pas de revente ni de diffusion publique.

## Outil d'analyse (/app)
- Les analyses générées par l'IA (Google Gemini) sont un outil d'accompagnement pédagogique, pas un diagnostic officiel ; elles peuvent contenir des erreurs.
- Utiliser l'outil pendant un examen surveillé ou une évaluation officielle est strictement interdit.
- Un abonnement (Basic ou Pro) est personnel et rattaché à un seul appareil. Une utilisation simultanée non autorisée sur plusieurs appareils peut entraîner la suspension du compte.
- Basic et Pro sont des abonnements facturés automatiquement tous les 3 mois jusqu'à annulation. Tu peux annuler à tout moment depuis Réglages → Gérer mon abonnement, sans justification.
- L'utilisation par un mineur sous le seuil légal de son marché (voir la Politique de confidentialité) nécessite l'autorisation d'un parent ou tuteur.

## Renseignements personnels
Voir la Politique de confidentialité : nous ne demandons ni ton nom, ni ton âge, ni ta caméra.

## Modifications
Toute modification est publiée sur cette page avec sa date. Elle ne s'applique pas à un billet déjà payé.

## Droit applicable
Ces conditions sont régies par les lois du Québec et du Canada. Tout différend relève des tribunaux du Québec.

## Contact
${BUSINESS.operator} · ${WHERE} · ${BUSINESS.email}`,
  en: `## Terms of Service
Last updated: ${BUSINESS.updatedEn}

These terms govern the use of ${BUSINESS.website}, the RPVD Bootcamp and the analysis tool. By booking a seat or using the site, you accept them. Nothing in these terms limits the rights granted to you by Quebec's Consumer Protection Act.

## The merchant
- ${BUSINESS.operator}
- ${WHERE}
- ${BUSINESS.email}
- ${BUSINESS.website}

## RPVD Bootcamp: the service
- A 90-minute live review session on Zoom (1 hour of method, then 30 minutes of questions), on a Sunday, on a topic chosen by students' votes.
- Topic, date, time, length, price and number of seats are shown before payment and repeated in the confirmation email, which is your copy of the contract.
- The Bootcamp is a private service, independent from the Ministry of Education and schools.

## RPVD Bootcamp: price and payment
- $20.00 CAD per ticket, all-in: no fee or tax is added to the displayed amount.
- One-time card payment via Stripe at booking. No subscription, no instalments, no interest or late fees.
- Payment is made by an adult: parent, guardian or student aged 18+.

## RPVD Bootcamp: refunds and cancellation
- Full refund on request until Saturday 11:59 p.m. (Quebec time) before the session, in one click from the confirmation email.
- No refunds on Sunday, the day of the class, including for released seats sold that day.
- If RPVD cancels the session or cannot deliver it because of an issue on our side, you are refunded in full automatically.

## RPVD Bootcamp: class access
- Your personal Zoom link arrives by email 30 to 60 minutes before the start. It works on one device at a time and must not be shared.
- Make sure your internet connection and device work: an issue on your side after the refund deadline does not entitle you to a refund.

## Class rules
- Students' cameras are off. Microphones are muted and opened only when the instructor gives the floor.
- Default display name is "Élève" plus a code. If you change it, use your first name or a respectful nickname.
- Questions go in the chat, respectfully. No hateful, harassing, sexual or violent content, no advertising.
- Never share your contact details (phone, social media, address) in the chat. Private messages between students are disabled.
- No recording, screenshots or redistribution of the class or materials.
- A student who seriously breaks these rules may be removed from the session, without a refund for that session.

## What we promise, and what we do not
- We teach problem-solving methods and common assessment traps, step by step.
- We do not guarantee any grade or academic result: success also depends on your own work.
- Content (methods, exercises, sheets) is for your personal study only: no resale or public distribution.

## Analysis tool (/app)
- AI-generated analyses (Google Gemini) are a learning-support tool, not an official diagnosis, and may contain mistakes.
- Using the tool during a proctored exam or official assessment is strictly prohibited.
- A subscription (Basic or Pro) is personal and tied to a single device. Unauthorized simultaneous use on several devices may lead to account suspension.
- Basic and Pro are billed automatically every 3 months until cancelled. You can cancel at any time from Settings → Manage subscription, no justification needed.
- Use by a minor below their market's legal threshold (see the Privacy Policy) requires a parent's or guardian's authorization.

## Personal information
See the Privacy Policy: we do not ask for your name, your age or your camera.

## Changes
Any change is published on this page with its date. It does not apply to an already-paid ticket.

## Governing law
These terms are governed by the laws of Quebec and Canada. Any dispute falls under the courts of Quebec.

## Contact
${BUSINESS.operator} · ${WHERE} · ${BUSINESS.email}`,
}

export const COOKIE_POLICY = {
  fr: `## Politique de cookies
Dernière mise à jour : ${UPDATED}

RPVD utilise un minimum de cookies/stockage local :
- Nécessaires : session de connexion (Supabase), préférence de région/langue, empreinte d'appareil anti-partage. Toujours actifs — le site ne fonctionne pas sans eux.
- Mesure d'audience et marketing (désactivés par défaut) : Google Analytics (statistiques de visite), Meta Pixel et Snap Pixel (mesure de nos publicités sur Instagram, Facebook et Snapchat). Chargés SEULEMENT si tu cliques « Tout accepter » : sans ton accord, aucun script de Google, de Meta ou de Snap n'est téléchargé. Meta et Snap déposent leurs propres témoins (par exemple _fbp, _fbc, _scid). Refuser est aussi simple qu'accepter.
- Stockage de session (sessionStorage, effacé à la fermeture de l'onglet) : le nom de la campagne publicitaire qui t'a amené (src, utm) et, si tu n'as pas refusé le marketing, l'identifiant de clic de la publicité (fbclid, ScCid). Ces identifiants ne sont envoyés à notre serveur que si tu coches la case de mesure publicitaire à la réservation, et ils sont effacés si tu refuses ou retires ton consentement.

La mesure côté serveur (API de conversions de Meta et de Snap) ne dépend pas d'un témoin du navigateur, mais elle exige quand même ton accord : elle n'a lieu que si tu coches la case facultative de la page de réservation (jamais cochée d'avance). Sans cette case, aucune confirmation d'achat n'est envoyée à Meta ni à Snap. Détails : politique de confidentialité, section « Mesure de nos publicités ».

Tu peux changer ou retirer ton choix à tout moment avec le lien « Gérer mes cookies » au bas des pages du Bootcamp (ou en vidant le stockage local de ton navigateur).`,
  en: `## Cookie Policy
Last updated: ${UPDATED_EN}

RPVD uses a minimal set of cookies/local storage:
- Necessary: login session (Supabase), region/language preference, anti-sharing device fingerprint. Always active — the site does not work without them.
- Analytics and marketing (off by default): Google Analytics (visit statistics), Meta Pixel and Snap Pixel (measuring our ads on Instagram, Facebook and Snapchat). Loaded ONLY if you click "Accept all": without your consent, no Google, Meta or Snap script is downloaded. Meta and Snap set their own cookies (e.g. _fbp, _fbc, _scid). Declining is as easy as accepting.
- Session storage (sessionStorage, erased when the tab is closed): the name of the ad campaign that brought you (src, utm) and, unless you declined marketing, the ad click identifier (fbclid, ScCid). These identifiers are sent to our server only if you tick the ad measurement box at booking, and they are erased if you decline or withdraw your consent.

Server-side measurement (Meta and Snap Conversions APIs) does not depend on a browser cookie, but it still requires your consent: it happens only if you tick the optional box on the booking page (never pre-ticked). Without that box, no purchase confirmation is sent to Meta or Snap. Details: privacy policy, "Ad measurement" section.

You can change or withdraw your choice at any time with the "Gérer mes cookies" link at the bottom of the Bootcamp pages (or by clearing your browser's local storage).`,
}

export const REFUND_POLICY = {
  fr: `## Politique de remboursement
Dernière mise à jour : ${UPDATED}

- Les abonnements Basic et Pro sont facturés d'avance pour une période de 3 mois.
- Tu peux annuler à tout moment ; l'annulation prend effet à la fin de la période déjà payée (pas de remboursement au prorata pour la période en cours).
- En cas d'erreur de facturation ou de problème technique avéré empêchant l'usage du service, écris-nous à ${SUPPORT_EMAIL} — nous traitons ces demandes au cas par cas.
- Un compte suspendu pour partage non autorisé (contrat, section « Compte et partage ») n'est pas remboursé.

### Bootcamp RPVD (sessions du dimanche en direct)
Section ajoutée le 5 octobre 2026.

- Prix : 20,00 $ CAD par billet, tout inclus. Le montant affiché est le montant payé.
- Remboursement intégral sur simple demande jusqu'au samedi 23 h 59 (heure du Québec) précédant la session, en un clic avec le bouton « Gérer / annuler ma réservation » du courriel de confirmation.
- Aucun remboursement le dimanche, jour du cours, y compris pour les places libérées remises en vente ce jour-là.
- Si RPVD annule une session, tous les billets sont remboursés intégralement et automatiquement.
- Le lien Zoom est personnel, envoyé 30 à 60 minutes avant le cours, et ne fonctionne que sur un appareil à la fois. Un lien partagé n'ouvre pas droit à un remboursement.
- Les élèves de moins de 18 ans doivent passer par un parent ou un tuteur pour réserver et payer.`,
  en: `## Refund Policy
Last updated: ${UPDATED_EN}

- Basic and Pro subscriptions are billed in advance for a 3-month period.
- You can cancel at any time; cancellation takes effect at the end of the already-paid period (no pro-rated refund for the current period).
- In case of a billing error or a confirmed technical issue preventing use of the service, write to us at ${SUPPORT_EMAIL} — we handle these on a case-by-case basis.
- An account suspended for unauthorized sharing (see Terms, "Account and Sharing") is not refunded.

### RPVD Bootcamp (live Sunday sessions)
Section added October 5, 2026.

- Price: $20.00 CAD per ticket, all-in. The displayed amount is the amount charged.
- Full refund on request until Saturday 11:59 p.m. (Quebec time) before the session, in one click from the "Manage / cancel my booking" button in the confirmation email.
- No refunds on Sunday, the day of the class, including for released seats resold that day.
- If RPVD cancels a session, every ticket is refunded in full automatically.
- The Zoom link is personal, sent 30 to 60 minutes before class, and works on one device at a time. A shared link does not entitle anyone to a refund.
- Students under 18 must have a parent or guardian book and pay.`,
}
