// VisualLevel — un niveau du Moteur D (calcul « RPVD Visuel » ou raisonnement « D-R ») : Identification,
// schéma ASCII (niveau 1), lignes de démarche affichées une à une (indice gradué), réponse, vérification, principe.
// Calcul : expression en LaTeX à gauche, explication à droite. Raisonnement : question mentale + piste (texte).
import { useState } from 'react'
import MathText, { autoMath, splitOutsideMath } from './MathText'

function LignesProgressives({ lignes, renderLigne, nextLabel, allLabel }) {
  const [n, setN] = useState(1)
  const tout = n >= lignes.length
  return (
    <div>
      <ol className="space-y-2" role="list">
        {lignes.slice(0, n).map((l, i) => (
          <li key={i}>{renderLigne(l, i)}</li>
        ))}
      </ol>
      {!tout && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setN(n + 1)}
            className="squishy focus-ring inline-flex min-h-[44px] items-center rounded-full bg-amber-500/15 px-4 text-sm font-semibold text-amber-300 hover:bg-amber-500/25"
          >
            {nextLabel}
          </button>
          <button
            type="button"
            onClick={() => setN(lignes.length)}
            className="focus-ring inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            {allLabel}
          </button>
        </div>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.5" />
    </svg>
  )
}

export default function VisualLevel({ level, answerLabel, mode = 'calcul', labels = {} }) {
  if (!level) return null
  const reasoning = mode === 'raisonnement'
  const fmt = (text, always = false) => (reasoning ? String(text ?? '') : autoMath(text, always))
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
                    <MathText text={fmt(item)} />
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
                  <MathText text={fmt(level.cherche)} />
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

      <LignesProgressives
        lignes={lines}
        nextLabel={labels.nextLine}
        allLabel={labels.showAll}
        renderLigne={(line) => (
          <div className="grid items-baseline gap-x-4 gap-y-0.5 rounded-xl bg-slate-900/50 px-3 py-2 motion-safe:animate-rise sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className={`min-w-0 overflow-x-auto overflow-y-hidden text-base text-slate-50 ${reasoning ? 'font-medium' : ''}`}>
              <MathText text={fmt(line.expression, true)} />
            </div>
            {line.explication && (
              <p className="text-sm text-slate-400">
                {reasoning ? '→ ' : '('}
                <MathText text={line.explication} />
                {reasoning ? '' : ')'}
              </p>
            )}
          </div>
        )}
      />

      {level.reponse && (
        <div>
          <p className="text-sm font-medium text-slate-400">{answerLabel}</p>
          <p className="mt-1 inline-block max-w-full overflow-x-auto overflow-y-hidden rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-lg font-bold text-emerald-300">
            <MathText text={fmt(level.reponse)} />
          </p>
        </div>
      )}

      {level.verification && (
        <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-300">
          <span className="text-emerald-400">
            <CheckIcon />
          </span>
          <span>
            <span className="font-semibold text-slate-100">{labels.verifyLabel} : </span>
            <MathText text={level.verification} />
          </span>
        </p>
      )}

      {level.principe && (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm leading-relaxed text-emerald-100">
          <MathText text={level.principe} />
        </p>
      )}
    </div>
  )
}
