import { useState, useEffect } from "react";
import UploadZone from "../components/UploadZone";
import AnalysisDisplay from "../components/AnalysisDisplay";

export default function Dashboard({ user, supabase }) {
  const [credits, setCredits] = useState(3);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showLevel2, setShowLevel2] = useState(false);
  const [showLevel3, setShowLevel3] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    const { data } = await supabase.from("users").select("credits").eq("id", user.id).single();
    setCredits(data?.credits || 0);
  };

  const handleUpload = async (base64) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/.netlify/functions/analyze-homework", {
        method: "POST",
        body: JSON.stringify({ imageBase64: base64, userId: user.id, region: "qc" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "L’analyse n’a pas pu être effectuée.");
      setAnalysis(json);
      setShowLevel2(false);
      setShowLevel3(false);
      fetchCredits();
    } catch (err) {
      console.error(err);
      setError(err.message || "Une erreur est survenue. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-500 mb-2">RPVD Success</h1>
        <p className="text-slate-400 mb-6">Crédits: {credits}</p>
        
        <UploadZone onUpload={handleUpload} loading={loading} />
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-400/40 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {analysis && (
          <div className="mt-8">
            <AnalysisDisplay
              level1={analysis.level_1}
              level2={showLevel2 ? analysis.level_2 : null}
              level3={showLevel3 ? analysis.level_3_steps : null}
              onLevel2={() => setShowLevel2(true)}
              onLevel3={() => setShowLevel3(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
