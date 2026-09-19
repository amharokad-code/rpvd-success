// Carte « verre » (contrat §3) : slate-800/50 + backdrop-blur + bordure white/5, coins rounded-3xl.
// `as` permet de changer la balise (section, article, li…) sans perdre le style.

export default function GlassCard({ className = '', children, as: Tag = 'div', ...props }) {
  return (
    <Tag className={`glass p-6 sm:p-8 ${className}`} {...props}>
      {children}
    </Tag>
  )
}
