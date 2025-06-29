import { Link } from "react-router-dom";
import { datasetRegresjaList } from "../data/datasetRegresja";

export default function DatasetsListPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Zbiory danych (regresja)</h2>
        <Link
          to="/upload-regression"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Dodaj nowy zbiór
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasetRegresjaList.map((dataset) => (
          <div key={dataset.id} className="border rounded-lg p-4 hover:shadow-md">
            <h3 className="font-semibold text-lg mb-2">{dataset.name}</h3>
            <div className="text-sm text-gray-600 mb-2">
              <p>Liczba punktów: {dataset.xValues.length}</p>
              <p>Status: {dataset.isPublic ? "Publiczny" : "Prywatny"}</p>
              <p>Utworzono: {new Date(dataset.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-xs text-gray-500">
              X: [{dataset.xValues.slice(0, 3).join(", ")}
              {dataset.xValues.length > 3 ? "..." : ""}]
            </div>
            <div className="text-xs text-gray-500">
              Y: [{dataset.yValues.slice(0, 3).join(", ")}
              {dataset.yValues.length > 3 ? "..." : ""}]
            </div>
          </div>
        ))}
        
        {datasetRegresjaList.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            Brak zbiorów danych. Dodaj pierwszy zbiór danych.
          </div>
        )}
      </div>
    </div>
  );
}
