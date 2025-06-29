import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { datasetRegresjaList } from "../data/datasetRegresja.ts";

export default function DatasetPageUpload() {
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files?.length) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      Papa.parse(selectedFile, {
        complete: (result) => {
          const data = result.data as string[][];
          if (data.length < 2 || data[0].length !== 2) {
            setError("CSV musi zawierać przynajmniej dwie kolumny i jeden wiersz danych.");
            return;
          }
          setPreviewData(data.slice(0, 6)); // podgląd 5 wierszy + nagłówek
        },
        error: () => setError("Błąd podczas czytania pliku CSV."),
      });
    }
  };

  const handleUpload = () => {
    if (!file || !title) {
      return alert("Uzupełnij nazwę oraz wybierz plik CSV.");
    }

    Papa.parse(file, {
      complete: (result) => {
        const data = result.data as string[][];
        const xValues: number[] = [];
        const yValues: number[] = [];

        for (let i = 1; i < data.length; i++) {
          const [x, y] = data[i];
          const xVal = parseFloat(x);
          const yVal = parseFloat(y);
          if (!isNaN(xVal) && !isNaN(yVal)) {
            xValues.push(xVal);
            yValues.push(yVal);
          }
        }

        if (xValues.length === 0 || yValues.length === 0) {
          return alert("Plik CSV nie zawiera poprawnych danych liczbowych.");
        }

        // Generate UUID for new dataset
        const newId = crypto.randomUUID();

        datasetRegresjaList.push({
          id: newId,
          name: title,
          xValues,
          yValues,
          isPublic,
          createdAt: new Date().toISOString(),
        });

        alert("Zbiór danych został dodany.");
        navigate("/datasets-regresja");
      },
      error: () => {
        alert("Błąd podczas parsowania pliku CSV.");
      },
    });
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
      {previewData.length > 0 && (
        <div className="mb-4 border p-3 rounded bg-gray-50">
          <p className="font-semibold mb-2">Podgląd danych:</p>
          <table className="text-sm">
            <thead>
              <tr>
                <th className="px-2">X</th>
                <th className="px-2">Y</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, i) => (
                <tr key={i}>
                  <td className="px-2">{row[0]}</td>
                  <td className="px-2">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Dodaj zbiór danych
      </button>
    </div>
  );
}
