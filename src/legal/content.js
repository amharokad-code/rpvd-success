// Textes légaux statiques (compilés dans le bundle, jamais chargés depuis Supabase).
// fr = Québec/France, en = US/UK. Format simple : lignes '## ' = titre, '- ' = liste, sinon paragraphe.

const UPDATED = '24 septembre 2026'
const UPDATED_EN = 'September 24, 2026'
const SUPPORT_EMAIL = 'support@rpvdsuccess.app'

export const PRIVACY_POLICY = {
  fr: `## Politique de confidentialité
Dernière mise à jour : ${UPDATED}

RPVD Success (« RPVD », « nous ») respecte ta vie privée. Cette politique explique quelles données nous collectons, pourquoi, et comment tu peux les contrôler.

## Ce que nous collectons
- Ton courriel, uniquement au moment où tu te connectes ou payes (lien magique, aucun mot de passe).
- Une empreinte technique de ton appareil (résolution, fuseau horaire, navigateur) pour empêcher le partage d'un même compte entre plusieurs personnes.
- Les photos d'exercices que tu téléverses, traitées temporairement (voir section IA ci-dessous).
- Les métadonnées de paiement (via Stripe) — nous ne voyons jamais ton numéro de carte.

## Intelligence artificielle et analyse d'images
RPVD utilise Google Gemini (Google AI Studio) pour analyser les photos d'exercices que tu téléverses.
- Les photos sont envoyées à Google Gemini uniquement pour générer l'analyse pédagogique demandée.
- Les photos ne sont PAS stockées de façon permanente sur nos serveurs — elles sont traitées et jamais écrites sur disque ; seule l'analyse textuelle générée est conservée dans ton compte.
- L'IA peut faire des erreurs d'analyse. Aucune décision automatisée n'affecte tes droits (art. 22 RGPD) — l'analyse est un outil pédagogique, jamais un verdict.
- Tu peux demander une révision manuelle en cas d'erreur reproductible via ${SUPPORT_EMAIL}.

## Consentement parental selon ton marché
Le seuil d'âge nécessitant l'autorisation d'un parent ou tuteur varie selon ta localisation :
- Québec : moins de 14 ans
- France : moins de 15 ans
- Royaume-Uni : moins de 13 ans
- États-Unis : moins de 13 ans (COPPA — accès bloqué sans consentement parental vérifiable)

Une déclaration d'âge est demandée avant le premier usage. Pour un accès payant, le paiement par carte de crédit constitue une confirmation qu'un adulte a autorisé et pris en charge l'achat.

## Sous-traitants
- Supabase (hébergement de la base de données et authentification)
- Netlify (fonctions serverless)
- Google AI Studio / Gemini (analyse d'images par IA)
- Stripe (traitement des paiements)

## Tes droits
Tu peux demander l'accès, la correction ou la suppression de tes données en écrivant à ${SUPPORT_EMAIL}.

## Notification de brèche de sécurité
En cas de brèche de sécurité affectant des données personnelles, nous notifierons les utilisateurs concernés et les autorités compétentes (CAI au Québec, CNIL en France, ICO au Royaume-Uni) dans les délais requis par la loi applicable.

## Contact
${SUPPORT_EMAIL}`,
  en: `## Privacy Policy
Last updated: ${UPDATED_EN}

RPVD Success ("RPVD", "we") respects your privacy. This policy explains what data we collect, why, and how you can control it.

## What we collect
- Your email, only when you sign in or pay (magic link, no password).
- A technical fingerprint of your device (screen, timezone, browser) to prevent one account being shared across multiple people.
- Homework photos you upload, processed temporarily (see AI section below).
- Payment metadata (via Stripe) — we never see your card number.

## Artificial Intelligence and Image Analysis
RPVD uses Google Gemini (Google AI Studio) to analyze the homework photos you upload.
- Photos are sent to Google Gemini only to generate the requested educational analysis.
- Photos are NOT permanently stored on our servers — they are processed and never written to disk; only the generated text analysis is kept in your account.
- The AI can make analysis mistakes. No automated decision affects your rights — the analysis is a learning tool, never a verdict.
- You can request a manual review of a reproducible error via ${SUPPORT_EMAIL}.

## Parental Consent by Market
The age threshold requiring parent/guardian authorization depends on your location:
- Quebec: under 14
- France: under 15
- United Kingdom: under 13
- United States: under 13 (COPPA — access blocked without verifiable parental consent)

An age declaration is required before first use. For paid access, payment by credit card is treated as confirmation that an adult authorized and is responsible for the purchase.

## Subprocessors
- Supabase (database hosting and authentication)
- Netlify (serverless functions)
- Google AI Studio / Gemini (AI image analysis)
- Stripe (payment processing)

## Your Rights
You can request access, correction, or deletion of your data by writing to ${SUPPORT_EMAIL}.

## Security Breach Notification
In the event of a security breach affecting personal data, we will notify affected users and the competent authorities within the timeframes required by applicable law.

## Contact
${SUPPORT_EMAIL}`,
}

export const TERMS_OF_SERVICE = {
  fr: `## Conditions générales d'utilisation
Dernière mise à jour : ${UPDATED}

## Limitation de responsabilité — Intelligence artificielle
RPVD Success utilise l'intelligence artificielle (Google Gemini) pour analyser les exercices soumis. Tu reconnais que :
- Les analyses générées sont un outil d'accompagnement pédagogique, pas un diagnostic officiel de compréhension ou de performance scolaire.
- RPVD Success ne peut être tenu responsable d'erreurs, omissions, ou interprétations incorrectes générées par l'IA.
- L'utilisation de RPVD en temps réel durant un examen surveillé ou une évaluation officielle est strictement interdite.

## Compte et partage
- Un abonnement (Basic ou Pro) est strictement personnel et rattaché à un seul appareil via empreinte technique.
- Toute tentative d'utilisation simultanée non autorisée sur plusieurs appareils entraîne la suspension immédiate du compte, sans préavis ni remboursement.

## Abonnement et facturation
- Basic et Pro sont des abonnements récurrents, facturés automatiquement tous les 3 mois jusqu'à annulation.
- Tu peux annuler à tout moment depuis Réglages → Gérer mon abonnement (portail Stripe), sans justification.

## Consentement parental et âge des utilisateurs
L'utilisation de RPVD par un mineur en dessous du seuil légal applicable (voir Politique de confidentialité) nécessite l'autorisation d'un parent ou tuteur légal. Le paiement par carte de crédit constitue une confirmation de cette autorisation par le titulaire de la carte.

## Contact
${SUPPORT_EMAIL}`,
  en: `## Terms of Service
Last updated: ${UPDATED_EN}

## Limitation of Liability — Artificial Intelligence
RPVD Success uses artificial intelligence (Google Gemini) to analyze submitted exercises. You acknowledge that:
- Generated analyses are a learning-support tool, not an official diagnosis of academic understanding or performance.
- RPVD Success cannot be held liable for errors, omissions, or incorrect interpretations generated by the AI.
- Using RPVD in real time during a proctored exam or official assessment is strictly prohibited.

## Account and Sharing
- A subscription (Basic or Pro) is strictly personal and tied to a single device via a technical fingerprint.
- Any unauthorized simultaneous use across multiple devices results in immediate account suspension, without notice or refund.

## Subscription and Billing
- Basic and Pro are recurring subscriptions, billed automatically every 3 months until cancelled.
- You can cancel at any time from Settings → Manage subscription (Stripe portal), no justification required.

## Parental Consent and User Age
Use of RPVD by a minor below the applicable legal threshold (see Privacy Policy) requires authorization from a parent or legal guardian. Payment by credit card is treated as confirmation of that authorization by the cardholder.

## Contact
${SUPPORT_EMAIL}`,
}

export const COOKIE_POLICY = {
  fr: `## Politique de cookies
Dernière mise à jour : ${UPDATED}

RPVD utilise un minimum de cookies/stockage local :
- **Nécessaires** : session de connexion (Supabase), préférence de région/langue, empreinte d'appareil anti-partage. Toujours actifs — le site ne fonctionne pas sans eux.
- **Marketing** (désactivé par défaut) : uniquement si tu acceptes la catégorie « Marketing » dans le bandeau de consentement, pour mesurer l'efficacité de nos publicités. Refuser est aussi simple qu'accepter.

Nous utilisons aussi un suivi côté serveur (Meta Conversions API) sur les confirmations d'achat, qui ne dépend pas d'un cookie navigateur — il s'agit d'une donnée transactionnelle liée à ton achat, légale indépendamment de ton choix de cookies.

Tu peux changer ton choix à tout moment en vidant le stockage local de ton navigateur.`,
  en: `## Cookie Policy
Last updated: ${UPDATED_EN}

RPVD uses a minimal set of cookies/local storage:
- **Necessary**: login session (Supabase), region/language preference, anti-sharing device fingerprint. Always active — the site does not work without them.
- **Marketing** (off by default): only if you accept the "Marketing" category in the consent banner, to measure ad performance. Declining is as easy as accepting.

We also use server-side tracking (Meta Conversions API) on purchase confirmations, which does not depend on a browser cookie — it is transactional data tied to your purchase, lawful independently of your cookie choice.

You can change your choice at any time by clearing your browser's local storage.`,
}

export const REFUND_POLICY = {
  fr: `## Politique de remboursement
Dernière mise à jour : ${UPDATED}

- Les abonnements Basic et Pro sont facturés d'avance pour une période de 3 mois.
- Tu peux annuler à tout moment ; l'annulation prend effet à la fin de la période déjà payée (pas de remboursement au prorata pour la période en cours).
- En cas d'erreur de facturation ou de problème technique avéré empêchant l'usage du service, écris-nous à ${SUPPORT_EMAIL} — nous traitons ces demandes au cas par cas.
- Un compte suspendu pour partage non autorisé (contrat, section « Compte et partage ») n'est pas remboursé.`,
  en: `## Refund Policy
Last updated: ${UPDATED_EN}

- Basic and Pro subscriptions are billed in advance for a 3-month period.
- You can cancel at any time; cancellation takes effect at the end of the already-paid period (no pro-rated refund for the current period).
- In case of a billing error or a confirmed technical issue preventing use of the service, write to us at ${SUPPORT_EMAIL} — we handle these on a case-by-case basis.
- An account suspended for unauthorized sharing (see Terms, "Account and Sharing") is not refunded.`,
}
