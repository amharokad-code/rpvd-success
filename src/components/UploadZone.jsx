import { useState } from "react";

export default function UploadZone({ onUpload, loading = false }) {
  const [preview, setPreview] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      onUpload(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-lg border-2 border-dashed border-amber-500 p-8 text-center">
      <input id="file-input" type="file" accept="image/*" onChange={handleFileChange} disabled={loading} className="sr-only" />
      <label htmlFor="file-input" className={`inline-flex rounded-md bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 focus-within:ring-2 focus-within:ring-amber-300 ${loading ? "cursor-wait opacity-60" : "cursor-pointer"}`}>
        {loading ? "Analyse en cours…" : "Prendre ou choisir une photo"}
      </label>
      <p className="mt-3 text-sm text-slate-400">Formats image acceptés</p>
      {preview && <img src={preview} alt="Aperçu du devoir" className="mx-auto mt-4 max-h-80 max-w-full rounded-md" />}
    </div>
  );
}
