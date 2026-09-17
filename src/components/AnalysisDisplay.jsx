export default function AnalysisDisplay({ level1, onLevel2, onLevel3, level2, level3 }) {
  return (
    <div className="bg-slate-800 rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-amber-500 mb-2">Comprendre le pattern</h3>
        <p className="text-slate-100">{level1}</p>
        {!level2 && (
          <div className="flex gap-2 mt-4">
            <button onClick={onLevel2} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">C'\''est clair!</button>
            <button onClick={onLevel3} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">J'\''comprends pas</button>
          </div>
        )}
      </div>

      {level2 && (
        <div>
          <h3 className="text-lg font-bold text-emerald-500 mb-2">Avec tes chiffres</h3>
          <p className="text-slate-100">{level2}</p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => {}} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">Ça aide!</button>
            <button onClick={onLevel3} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">Encore?</button>
          </div>
        </div>
      )}

      {level3 && Array.isArray(level3) && (
        <div>
          <h3 className="text-lg font-bold text-emerald-500 mb-2">Étape par étape</h3>
          {level3.map((step) => (
            <div key={step.number} className="mb-3 p-3 bg-slate-700 rounded">
              <p className="font-bold text-amber-500">Étape {step.number}</p>
              <p className="text-slate-100">{step.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
