// Identité « Pyramid Ascension » (même palette que le web : noir mat, ambre terne en petites
// touches, vert émeraude pour le succès). Jamais d'orange vif en grande surface.
export const colors = {
  bg: '#000000',
  surface: '#0d0d0f',
  surfaceRaised: '#17171a',
  border: 'rgba(203,213,225,0.12)',
  borderStrong: 'rgba(203,213,225,0.24)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  amber: '#c98a52',
  amberDeep: '#a8692f',
  amberSoft: 'rgba(201,138,82,0.14)',
  orange: '#f2994a',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.12)',
  rose: '#fb7185',
  roseSoft: 'rgba(251,113,133,0.12)',
} as const

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const

export const font = {
  display: { fontWeight: '800' as const },
  bold: { fontWeight: '700' as const },
  semibold: { fontWeight: '600' as const },
  mono: { fontFamily: 'Courier', fontWeight: '700' as const },
}
