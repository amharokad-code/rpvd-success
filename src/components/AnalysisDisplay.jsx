export default function AnalysisDisplay({ level1, level2, level3, onLevel2, onLevel3 }) {
  return (
    <div className="bg-slate-800 p-6 rounded-lg space-y-4">
      <div className="text-slate-100">{level1}</div>
      {level2 ? (
        <div className="text-slate-100">{level2}</div>
      ) : (
        <button onClick={onLevel2} className="bg-emerald-500 px-4 py-2 rounded text-slate-900">
          J’ai besoin d’un indice
        </button>
      )}
      {level2 && (level3 ? (
        <ol className="list-decimal space-y-2 pl-5 text-slate-100">
          {level3.map((step, index) => <li key={index}>{step}</li>)}
        </ol>
      ) : (
        <button onClick={onLevel3} className="bg-amber-500 px-4 py-2 rounded text-slate-900">
          Voir les étapes
        </button>
      ))}
    </div>
  );
}
