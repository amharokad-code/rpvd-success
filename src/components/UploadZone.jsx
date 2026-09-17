import { useState } from "react";

export default function UploadZone({ onUpload }) {
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      onUpload(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border-2 border-dashed border-amber-500 p-8 rounded-lg text-center">
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="hidden"
        id="file-input"
      />
      <label htmlFor="file-input" className="cursor-pointer text-slate-100">
        Prends une photo ou upload un PDF
      </label>
      {preview && <img src={preview} alt="preview" className="mt-4 max-w-sm mx-auto" />}
    </div>
  );
}
