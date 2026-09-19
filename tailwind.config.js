// Tokens de design « Playful Dark-Glass » (contrat §3).
// Tailwind v4 charge ce fichier via `@config "../tailwind.config.js"` dans src/index.css.
// CommonJS (package.json a "type":"commonjs") pour éviter l'avertissement Node
// « Failed to load the ES module » lors du chargement natif par Tailwind/Vite.
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Accent chaud réservé au micro-feedback (jamais en fond, jamais en masse).
      colors: {
        coral: '#FF8E72',
        'coral-soft': '#FFB4A0',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Inconsolata', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // Glow + liseré « glossy » combinés, pour les boutons pleins en dégradé.
        'glow-amber': 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1), 0 0 15px rgba(245,158,11,0.45)',
        'glow-emerald': 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1), 0 0 15px rgba(16,185,129,0.45)',
        'glow-coral': 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1), 0 0 18px rgba(255,142,114,0.5)',
        // Liseré clair en haut de carte (verre biseauté) + ombre portée douce.
        glass: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.35)',
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
          '0%': { color: '#fbbf24', transform: 'scale(1)' },
          '40%': { color: '#fbbf24', transform: 'scale(1.12)' },
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
        // Halo amber qui respire (dernier crédit).
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(245,158,11,0)' },
          '50%': { boxShadow: '0 0 15px rgba(245,158,11,0.45)' },
        },
      },
      animation: {
        bop: 'bop 300ms ease-out both',
        'value-pulse': 'value-pulse 700ms cubic-bezier(.34,1.56,.64,1) both',
        rise: 'rise 320ms ease-out both',
        'spring-in': 'spring-in 480ms cubic-bezier(.34,1.56,.64,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'glow-pulse': 'glow-pulse 1.8s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.34,1.56,.64,1)',
      },
    },
  },
  plugins: [],
}
