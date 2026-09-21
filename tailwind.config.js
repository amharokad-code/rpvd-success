// Tokens de design « Playful Dark-Glass » (contrat §3).
// Tailwind v4 charge ce fichier via `@config "../tailwind.config.js"` dans src/index.css.
// CommonJS (package.json a "type":"commonjs") pour éviter l'avertissement Node
// « Failed to load the ES module » lors du chargement natif par Tailwind/Vite.
// Palette « Pyramid Ascension » extraite du logo (contrat rebrand) : l'orange remplace
// l'ambre Tailwind générique PARTOUT en overridant la teinte `amber` elle-même plutôt qu'en
// renommant chaque classe dans 14 fichiers — tout `amber-400/500/600` existant hérite donc
// automatiquement du nouvel orange, sans toucher au JSX des composants.
const PYRAMID_ORANGE = '#f2994a'
const PYRAMID_ORANGE_DEEP = '#e07b2e'
const PYRAMID_WHITE = '#f5f5f0'
const PYRAMID_GREY = '#6b6d70'
// Ambre "terne" (contrat design v2, demande explicite) : moins de saturation que l'orange pur
// du logo, réservé maintenant à un usage de PETITES touches (CTA, badges, glow) plutôt qu'aux
// grandes surfaces — `pyramid.orange` (vif) reste disponible pour le logo et les accents ciblés.
const MUTED_AMBER = '#c98a52'
const MUTED_AMBER_DEEP = '#a8692f'

module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coral: '#FF8E72',
        'coral-soft': '#FFB4A0',
        // Override de la teinte `amber` native : rebrand global sans sed sur les composants.
        amber: {
          300: '#d9ab7c',
          400: MUTED_AMBER,
          500: MUTED_AMBER,
          600: MUTED_AMBER_DEEP,
          700: '#8a5426',
        },
        // Tokens nommés du logo, pour les usages explicitement "marque" (Logo.jsx, tokens 1:1).
        pyramid: {
          orange: PYRAMID_ORANGE,
          'orange-deep': PYRAMID_ORANGE_DEEP,
          white: PYRAMID_WHITE,
          grey: PYRAMID_GREY,
        },
        void: '#000000',
        surface: '#0d0d0f',
        'surface-raised': '#17171a',
      },
      fontFamily: {
        // Bold condensée proche du wordmark du logo, réservée aux titres.
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Fira Code"', 'Inconsolata', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // Glow + liseré « glossy » combinés, pour les boutons pleins en dégradé.
        'glow-amber': `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1), 0 0 15px rgba(242,153,74,0.45)`,
        'glow-emerald': 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1), 0 0 15px rgba(16,185,129,0.45)',
        'glow-coral': 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1), 0 0 18px rgba(255,142,114,0.5)',
        // Liseré clair en haut de carte (verre biseauté) + ombre portée douce.
        glass: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.5)',
      },
      keyframes: {
        // Apparition « pop » d'une carte.
        bop: {
          '0%': { transform: 'scale(.95)', opacity: '0' },
          '60%': { transform: 'scale(1.02)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        // Pulsation des valeurs de l'élève lors du passage niveau 1 → 2.
        'value-pulse': {
          '0%': { color: PYRAMID_ORANGE, transform: 'scale(1)' },
          '40%': { color: PYRAMID_ORANGE, transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        // Montée douce en cascade (étapes du niveau 3).
        rise: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Entrée élastique (modales, badge « compris du premier coup »).
        'spring-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(.98)' },
          '70%': { transform: 'translateY(-2px) scale(1.01)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        // Reflet glissant sur les squelettes de chargement.
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Halo orange pyramide qui respire (dernier crédit).
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(242,153,74,0)' },
          '50%': { boxShadow: '0 0 15px rgba(242,153,74,0.45)' },
        },
        // Dérive très lente de la grille de fond (contrat design v2 : "mini vivant").
        'grid-drift': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '48px 48px' },
        },
        // Flottement quasi imperceptible (logo, icônes de statut).
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        // Reflet qui balaie un bouton plein au repos, discret, pour signaler "vivant".
        sweep: {
          '0%': { backgroundPosition: '-150% 0' },
          '60%, 100%': { backgroundPosition: '150% 0' },
        },
      },
      animation: {
        bop: 'bop 300ms ease-out both',
        'value-pulse': 'value-pulse 700ms cubic-bezier(.34,1.56,.64,1) both',
        rise: 'rise 320ms ease-out both',
        'spring-in': 'spring-in 480ms cubic-bezier(.34,1.56,.64,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'glow-pulse': 'glow-pulse 1.8s ease-in-out infinite',
        'grid-drift': 'grid-drift 22s linear infinite',
        float: 'float 5s ease-in-out infinite',
        sweep: 'sweep 6s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.34,1.56,.64,1)',
      },
    },
  },
  plugins: [],
}
