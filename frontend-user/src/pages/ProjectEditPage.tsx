import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { ProjectDetail, ProjectMeta } from "../models/project";
import { Play } from "lucide-react";
import { datasetService, DatasetMetadata } from "../api/datasetService";

export default function ProjectEditPage() {
  const { id } = useParams();
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [datasetSearch] = useState("");
  const [calculationResult, setCalculationResult] = useState<{
    prediction: number[];
    svg_plot: string;
  } | null>(null);

  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    if (!id || !token) return;

    axiosInstance
      .get(`/Project/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setMeta(res.data.meta);
        setDetail(() => ({
          ...res.data.detail,
          isPublic: res.data.meta.isPublic,
        }));
      })
      .finally(() => setLoading(false));

    // Pobierz dostępne datasety (publiczne i użytkownika)
    datasetService
      .getAllDatasets(token)
      .then(({ public: publicDatasets, user: userDatasets }) => {
        // Ujednolicenie typów (userDatasets nie ma username, ale nie jest potrzebny do wyboru)
        const all = [
          ...publicDatasets,
          ...userDatasets.map((ds) => ({ ...ds, username: "" })),
        ];
        setDatasets(all);
      })
      .catch(() => setDatasets([]));
  }, [id, token]);

  const handleStartCalculation = () => {
    if (!id || !detail) return;
    axiosInstance
      .post(`/Calculation/start`, id, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setCalculationResult(res.data);
        alert("Obliczenia zostały uruchomione");
      })
      .catch(() => alert("Wystąpił błąd podczas obliczeń."));
  };

  const handleSaveDetails = () => {
    if (!id || !detail || !meta) return;

    axiosInstance
      .put(
        `/Project/${id}/details`,
        { ...detail, datasetId: meta.datasetId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then(() => alert("Zapisano zmiany w projekcie."))
      .catch(() => alert("Błąd podczas zapisywania zmian."));
  };

  const handleDeleteProject = () => {
    if (!id) return;

    const confirmed = window.confirm("Czy na pewno chcesz usunąć ten projekt?");
    if (!confirmed) return;

    axiosInstance
      .delete(`/Project/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(() => {
        alert("Projekt został usunięty.");
        navigate("/projects");
      })
      .catch(() => alert("Wystąpił błąd podczas usuwania projektu."));
  };

  const handleDatasetChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (!meta || !id || !token) return;
    const newDatasetId = e.target.value;
    setMeta((meta) => meta && { ...meta, datasetId: newDatasetId });
    try {
      await axiosInstance.put(
        `/Project/${id}/dataset`,
        JSON.stringify(newDatasetId),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch {
      alert("Błąd podczas zmiany datasetu.");
    }
  };

  if (!meta || !detail)
    return <div className="p-4">Nie znaleziono projektu.</div>;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 bg-card text-card-foreground p-6 shadow-md overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 text-foreground">
          Nazwa Projektu: {meta.name}
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            X Column
          </label>
          <input
            type="text"
            value={detail.xColumn}
            onChange={(e) => setDetail({ ...detail, xColumn: e.target.value })}
            className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Y Column
          </label>
          <input
            type="text"
            value={detail.yColumn}
            onChange={(e) => setDetail({ ...detail, yColumn: e.target.value })}
            className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Projekt
          </label>
          <input
            type="checkbox"
            checked={!!detail.isPublic}
            onChange={(e) => {
              setDetail({ ...detail, isPublic: e.target.checked });
            }}
            className="mr-2"
          />
          <span>Publiczny</span>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Dataset
          </label>
          <select
            value={meta?.datasetId || ""}
            onChange={handleDatasetChange}
            className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
          >
            <option value="">Wybierz dataset</option>
            {datasets
              .filter((ds) =>
                ds.name.toLowerCase().includes(datasetSearch.toLowerCase())
              )
              .map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name}
                </option>
              ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Metoda obliczeń
          </label>
          <select
            value={detail.algorithm}
            onChange={(e) =>
              setDetail({ ...detail, algorithm: e.target.value })
            }
            className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
          >
            <option value="linear">Regresja liniowa</option>
            <option value="ridge">Regresja grzbietowa</option>
            <option value="lasso">Lasso</option>
          </select>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-6 relative bg-background text-foreground">
        {/* Topbar */}
        <div className="flex justify-center gap-6 mb-6 bg-muted p-3 rounded">
          <button
            onClick={handleSaveDetails}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Zapisz zmiany
          </button>

          <button
            onClick={handleStartCalculation}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 shadow"
          >
            <Play />
          </button>

          <button
            onClick={handleDeleteProject}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Usuń projekt
          </button>
        </div>

        {/* TODO
        Podgląd wyników i wizualizacja
        */}
        <div className="text-gray-600">
          {calculationResult && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Predykcje:</h3>
              <ul className="mb-4">
                {calculationResult.prediction.map((val, idx) => (
                  <li key={idx}>
                    Wynik {idx + 1}: {val}
                  </li>
                ))}
              </ul>
              <h3 className="font-bold mb-2">Wizualizacja:</h3>
              <div className="border p-2 bg-card rounded text-card-foreground">
                <div
                  dangerouslySetInnerHTML={{
                    __html: atob(calculationResult.svg_plot),
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Loader */}
        <div className={`loader ${!loading ? "loader-hidden" : ""}`} />
      </div>
    </div>
  );
}
