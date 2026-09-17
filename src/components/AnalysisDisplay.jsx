export default function AnalysisDisplay({ level1, level2, level3Steps }) {
  return (
    <div className="bg-slate-800 p-6 rounded-lg space-y-4">
      <div className="text-slate-100">{level1}</div>
      <button className="bg-emerald-500 px-4 py-2 rounded text-slate-900">
        C\'est clair!
      </button>
    </div>
  );
}
