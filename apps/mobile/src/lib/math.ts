// Utilitaires LaTeX côté natif (le rendu riche passe par MathFiche / WebView).

// Texte lisible sans LaTeX (arbre de cheminement, lecture) : « Isoler $V_1$ » → « Isoler V₁ ».
const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
}
const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
}

export function plainMath(text: string): string {
  return String(text ?? '')
    .replace(/\$+/g, '')
    .replace(/\\(?:text|mathrm)\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\\cdot|\\times/g, '·')
    .replace(/\\approx/g, '≈')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\pm/g, '±')
    .replace(/\\ /g, ' ')
    .replace(/_\{?(\d+)\}?/g, (_m, d: string) => [...d].map((c) => SUB[c] ?? c).join(''))
    .replace(/\^\{?(\d+)\}?/g, (_m, d: string) => [...d].map((c) => SUP[c] ?? c).join(''))
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
}
