import { useState } from "react";

export default function UploadZone({ onUpload, loading }) {
  const [preview, setPreview] = useState(null);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPreview(evt.target.result);
        const base64 = evt.target.result.split(",")[1];
        onUpload(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="border-2 border-dashed border-amber-500 rounded-lg p-8 text-center">
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={loading}
        className="hidden"
        id="upload"
      />
      <label htmlFor="upload" className="cursor-pointer">
        {preview ? (
          <img src={preview} alt="preview" className="max-h-64 mx-auto mb-4" />
        ) : (
          <p className="text-slate-400">📸 Clique ou glisse ton image</p>
        )}
      </label>
      {loading && <p className="text-amber-500 mt-2">Analyse en cours...</p>}
    </div>
  );
}
