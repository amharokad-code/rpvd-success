export default function AnalysisDisplay({ level1, level2, level3, onLevel2, onLevel3 }) {
  return (
    <div className="space-y-4 rounded-lg bg-slate-800 p-6">
      <section>
        <h2 className="mb-2 text-lg font-semibold text-amber-400">Premier indice</h2>
        <p className="whitespace-pre-wrap text-slate-100">{level1}</p>
      </section>

      {!level2 && <RevealButton onClick={onLevel2}>J’ai besoin d’un autre indice</RevealButton>}

      {level2 && (
        <section className="border-t border-slate-700 pt-4">
          <h2 className="mb-2 text-lg font-semibold text-amber-400">Deuxième indice</h2>
          <p className="whitespace-pre-wrap text-slate-100">{level2}</p>
          {!level3 && <RevealButton onClick={onLevel3}>Montrer les étapes</RevealButton>}
        </section>
      )}

      {level3 && (
        <section className="border-t border-slate-700 pt-4">
          <h2 className="mb-2 text-lg font-semibold text-amber-400">Résolution guidée</h2>
          {Array.isArray(level3) ? (
            <ol className="list-decimal space-y-2 pl-5 text-slate-100">
              {level3.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
            </ol>
          ) : <p className="whitespace-pre-wrap text-slate-100">{level3}</p>}
        </section>
      )}
    </div>
  );
}

function RevealButton({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="mt-4 rounded bg-emerald-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300">
      {children}
    </button>
  );
}
