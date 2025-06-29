import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { datasetService } from "../api/datasetService";

export default function DatasetPageUpload() {
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files?.length) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Basic validation - just check if it's a CSV file
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError("Proszę wybrać plik CSV.");
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      return alert("Uzupełnij nazwę oraz wybierz plik CSV.");
    }

    setIsUploading(true);
    setError(null);

    try {
      // Read file as text
      const csvText = await file.text();
      
      const response = await datasetService.uploadCsv(csvText, title, isPublic);
      alert(`${response.message}. ID: ${response.datasetId}`);
      navigate("/datasets-regresja");
    } catch (err: any) {
      setError("Błąd podczas wysyłania pliku: " + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Dodaj zbiór danych (regresja)</h2>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Nazwa zbioru danych</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Plik CSV</label>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        {error && <p className="text-red-600 mt-1 text-sm">{error}</p>}
      </div>
      
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mr-2"
          />
          Publiczny zbiór danych
        </label>
      </div>
      <button
        onClick={handleUpload}
        disabled={isUploading}
        className={`px-4 py-2 rounded text-white ${
          isUploading 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isUploading ? "Wysyłanie..." : "Dodaj zbiór danych"}
      </button>
    </div>
  );
}
