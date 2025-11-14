import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { ProjectDetail, ProjectMeta } from "../models/project";
import { Play, ArrowLeft } from "lucide-react";
import { datasetService, DatasetMetadata } from "../api/datasetService";
import { Button } from "../ui/button";

export default function ProjectEditPage() {
  const { id } = useParams();
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [datasetSearch] = useState("");
  const [datasetColumns, setDatasetColumns] = useState<string[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [calculationResult, setCalculationResult] = useState<{
    prediction: number[];
    svg_plot: string;
  } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);

  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);

  // Konfiguracja wymaganych parametrów dla każdej metody
  const paramConfig: Record<
    string,
    Array<{
      key: string;
      label: string;
      type: "number" | "text" | "select";
      options?: string[];
      min?: number;
    }>
  > = {
    linear: [],
    ridge: [{ key: "alpha", label: "Alpha", type: "number", min: 0 }],
    lasso: [{ key: "alpha", label: "Alpha", type: "number", min: 0 }],
    polynomial: [
      { key: "degree", label: "Stopień (degree)", type: "number", min: 1 },
    ],
    svr: [
      {
        key: "kernel",
        label: "Kernel",
        type: "select",
        options: ["linear", "poly", "rbf", "sigmoid"],
      },
      { key: "C", label: "C", type: "number", min: 0 },
      { key: "epsilon", label: "Epsilon", type: "number", min: 0 },
    ],
    "decision-tree": [
      { key: "max_depth", label: "Max depth", type: "number", min: 1 },
      { key: "random_state", label: "Random state", type: "number", min: 0 },
    ],
    elasticnet: [
      { key: "alpha", label: "Alpha", type: "number", min: 0 },
      { key: "l1_ratio", label: "L1 ratio", type: "number", min: 0 },
    ],
    "random-forest": [
      { key: "max_depth", label: "Max depth", type: "number", min: 1 },
      { key: "random_state", label: "Random state", type: "number", min: 0 },
      {
        key: "n_estimators",
        label: "Liczba drzew (n_estimators)",
        type: "number",
        min: 1,
      },
    ],
  };

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
        // Użyj danych z backendu jako źródła prawdy
        setDetail(() => ({
          ...res.data.detail,
          isPublic: res.data.meta.isPublic,
        }));
        // Brak niezapisanych zmian zaraz po wczytaniu
        setHasUnsavedChanges(false);
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
      .post(`/Calculation/start`, JSON.stringify(id), {
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
      .then(() => {
        alert("Zapisano zmiany w projekcie.");
        setHasUnsavedChanges(false);
      })
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

  // Fetch columns when dataset changes
  useEffect(() => {
    const fetchColumns = async () => {
      if (!meta?.datasetId || !token) {
        setDatasetColumns([]);
        return;
      }

      // Only fetch columns for CSV datasets (not empty GUID)
      if (meta.datasetId === "00000000-0000-0000-0000-000000000000") {
        setDatasetColumns([]);
        return;
      }

      setLoadingColumns(true);
      try {
        const columns = await datasetService.getDatasetColumns(
          meta.datasetId,
          token
        );
        setDatasetColumns(columns);
      } catch (error) {
        console.error("Error fetching columns:", error);
        setDatasetColumns([]);
      } finally {
        setLoadingColumns(false);
      }
    };

    fetchColumns();
  }, [meta?.datasetId, token]);

  const handleDatasetChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (!meta || !id || !token) return;
    const newDatasetId = e.target.value;
    setMeta((meta) => meta && { ...meta, datasetId: newDatasetId });

    // Reset column selections when dataset changes
    setDetail((detail) =>
      detail ? { ...detail, xColumn: "", yColumn: "" } : null
    );
    setHasUnsavedChanges(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Ładowanie projektu...</div>
      </div>
    );
  }

  if (!meta || !detail) {
    return (
      <div className="p-4">
        <div className="text-lg font-semibold mb-2">
          Nie znaleziono projektu.
        </div>
        <button
          onClick={() => navigate("/projects")}
          className="text-blue-600 hover:underline"
        >
          Powrót do listy projektów
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 bg-card text-card-foreground p-6 shadow-md overflow-y-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/projects")}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót do projektów
        </Button>
        <h2 className="text-xl font-bold mb-6 text-foreground">
          Nazwa Projektu: {meta.name}
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            X Column
          </label>
          {datasetColumns.length > 0 ? (
            <select
              value={detail.xColumn}
              onChange={(e) => {
                setDetail({ ...detail, xColumn: e.target.value });
                setHasUnsavedChanges(true);
              }}
              className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
              disabled={loadingColumns}
            >
              <option value="">Wybierz kolumnę</option>
              {datasetColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={detail.xColumn}
              onChange={(e) => {
                setDetail({ ...detail, xColumn: e.target.value });
                setHasUnsavedChanges(true);
              }}
              placeholder={
                meta.datasetId === "00000000-0000-0000-0000-000000000000"
                  ? "Wybierz dataset, aby załadować kolumny"
                  : loadingColumns
                  ? "Ładowanie kolumn..."
                  : "Brak dostępnych kolumn"
              }
              disabled={loadingColumns}
              className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
            />
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            X2 Column (opcjonalnie)
          </label>
          {datasetColumns.length > 0 ? (
            <select
              value={detail.x2Column || ""}
              onChange={(e) => {
                setDetail({ ...detail, x2Column: e.target.value });
                setHasUnsavedChanges(true);
              }}
              className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
              disabled={loadingColumns}
            >
              <option value="">Brak</option>
              {datasetColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={detail.x2Column || ""}
              onChange={(e) => {
                setDetail({ ...detail, x2Column: e.target.value });
                setHasUnsavedChanges(true);
              }}
              placeholder={
                meta.datasetId === "00000000-0000-0000-0000-000000000000"
                  ? "Wybierz dataset, aby załadować kolumny"
                  : loadingColumns
                  ? "Ładowanie kolumn..."
                  : "Brak dostępnych kolumn"
              }
              disabled={loadingColumns}
              className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
            />
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Y Column
          </label>
          {datasetColumns.length > 0 ? (
            <select
              value={detail.yColumn}
              onChange={(e) => {
                setDetail({ ...detail, yColumn: e.target.value });
                setHasUnsavedChanges(true);
              }}
              className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
              disabled={loadingColumns}
            >
              <option value="">Wybierz kolumnę</option>
              {datasetColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={detail.yColumn}
              onChange={(e) => {
                setDetail({ ...detail, yColumn: e.target.value });
                setHasUnsavedChanges(true);
              }}
              placeholder={
                meta.datasetId === "00000000-0000-0000-0000-000000000000"
                  ? "Wybierz dataset, aby załadować kolumny"
                  : loadingColumns
                  ? "Ładowanie kolumn..."
                  : "Brak dostępnych kolumn"
              }
              disabled={loadingColumns}
              className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
            />
          )}
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
              setHasUnsavedChanges(true);
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
            onChange={(e) => {
              setDetail({ ...detail, algorithm: e.target.value });
              setHasUnsavedChanges(true);
            }}
            className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
          >
            <option value="linear">Regresja liniowa</option>
            <option value="ridge">Regresja grzbietowa</option>
            <option value="lasso">Lasso</option>
            <option value="svr">SVR</option>
            <option value="decision-tree">Drzewo decyzyjne</option>
            <option value="elasticnet">Elastic Net</option>
            <option value="random-forest">Random Forest</option>
            <option value="polynomial">Wielomianowa</option>
          </select>
        </div>

        {/* Dynamiczne parametry zależne od metody */}
        {paramConfig[detail.algorithm]?.length > 0 && (
          <div className="mb-6 space-y-3">
            {paramConfig[detail.algorithm].map((p) => (
              <div key={p.key}>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {p.label}
                </label>
                {p.type === "select" ? (
                  <select
                    value={detail.parameters?.[p.key] ?? ""}
                    onChange={(e) => {
                      setDetail({
                        ...detail,
                        parameters: {
                          ...detail.parameters,
                          [p.key]: e.target.value,
                        },
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
                  >
                    <option value="">Wybierz</option>
                    {p.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={p.type}
                    min={p.min}
                    value={detail.parameters?.[p.key] ?? ""}
                    onChange={(e) => {
                      setDetail({
                        ...detail,
                        parameters: {
                          ...detail.parameters,
                          [p.key]: e.target.value,
                        },
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="border border-border px-2 py-1 w-full rounded bg-input-background text-card-foreground"
                  />
                )}
              </div>
            ))}
          </div>
        )}
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
            className={`px-6 py-2 rounded shadow text-white ${
              hasUnsavedChanges
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={hasUnsavedChanges}
            title={
              hasUnsavedChanges
                ? "Najpierw zapisz zmiany"
                : "Uruchom obliczenia"
            }
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

        <div className="text-gray-600">
          {calculationResult && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-2">Wizualizacja:</h3>
                <div className="border p-2 bg-card rounded text-card-foreground">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: calculationResult.svg_plot,
                    }}
                  />
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-2">Informacje o modelu:</h3>
                {(() => {
                  const info = (calculationResult as any).model_info;
                  const degree = (calculationResult as any).degree;
                  const n_features = (calculationResult as any).n_features;
                  const coefficients =
                    (calculationResult as any).coefficients ||
                    info?.coefficients;
                  const intercept =
                    (calculationResult as any).intercept || info?.intercept;
                  const r2 = info?.r_squared;
                  return (
                    <div className="space-y-2 text-sm">
                      {typeof degree !== "undefined" && (
                        <div>
                          <span className="font-medium">Degree:</span> {degree}
                        </div>
                      )}
                      {typeof n_features !== "undefined" && (
                        <div>
                          <span className="font-medium">Liczba cech:</span>{" "}
                          {n_features}
                        </div>
                      )}
                      {typeof r2 !== "undefined" && (
                        <div>
                          <span className="font-medium">R²:</span> {r2}
                        </div>
                      )}
                      {typeof intercept !== "undefined" && (
                        <div>
                          <span className="font-medium">Intercept:</span>{" "}
                          {intercept}
                        </div>
                      )}
                      {Array.isArray(coefficients) && (
                        <div>
                          <div className="font-medium">Współczynniki:</div>
                          <ul className="list-disc ml-5">
                            {coefficients.map((c: number, i: number) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
