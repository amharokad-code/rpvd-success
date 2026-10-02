// VisualLevel — un niveau du Moteur D « RPVD Visuel v2 » : Identification, schéma ASCII (niveau 1),
// démarche ligne par ligne (expression à gauche, explication à droite ; empilé sur mobile), réponse, principe.
import MathText, { autoMath, splitOutsideMath } from './MathText'

export default function VisualLevel({ level, answerLabel }) {
  if (!level) return null
  const connu = splitOutsideMath(level.connu)
  const lines = Array.isArray(level.demarche) ? level.demarche : []

  return (
    <div className="space-y-4">
      {(connu.length > 0 || level.cherche) && (
        <dl className="flex flex-col gap-2 font-mono text-sm">
          {connu.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="shrink-0 font-semibold tracking-wide text-amber-400">CONNU :</dt>
              <dd className="flex flex-wrap gap-1.5">
                {connu.map((item, i) => (
                  <span key={i} className="rounded-md border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-100">
                    <MathText text={autoMath(item)} />
                  </span>
                ))}
              </dd>
            </div>
          )}
          {level.cherche && (
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="shrink-0 font-semibold tracking-wide text-emerald-400">CHERCHE :</dt>
              <dd>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                  <MathText text={autoMath(level.cherche)} />
                </span>
              </dd>
            </div>
          )}
        </dl>
      )}

      {level.schema_ascii && (
        <pre className="overflow-x-auto whitespace-pre rounded-xl border border-white/10 bg-slate-950/70 p-3 font-mono text-[11px] leading-snug text-amber-200 sm:text-sm">
          {level.schema_ascii}
        </pre>
      )}

      <ol className="space-y-2" role="list">
        {lines.map((line, i) => (
          <li
            key={i}
            className="grid items-baseline gap-x-4 gap-y-0.5 rounded-xl bg-slate-900/50 px-3 py-2 motion-safe:animate-rise sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="min-w-0 overflow-x-auto overflow-y-hidden text-base text-slate-50">
              <MathText text={autoMath(line.expression, true)} />
            </div>
            {line.explication && (
              <p className="text-sm text-slate-400">
                (<MathText text={line.explication} />)
              </p>
            )}
          </li>
        ))}
      </ol>

      {level.reponse && (
        <div>
          <p className="text-sm font-medium text-slate-400">{answerLabel}</p>
          <p className="mt-1 inline-block max-w-full overflow-x-auto overflow-y-hidden rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-lg font-bold text-emerald-300">
            <MathText text={autoMath(level.reponse)} />
          </p>
        </div>
      )}

      {level.principe && (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm leading-relaxed text-emerald-100">
          <MathText text={level.principe} />
        </p>
      )}
    </div>
  )
}
