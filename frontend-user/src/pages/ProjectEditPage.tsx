import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { ProjectDetail, ProjectMeta } from "../models/project";
import { Play, ArrowLeft, Save, Trash2 } from "lucide-react";
import { datasetService, DatasetMetadata } from "../api/datasetService";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import "../styles/Loader.css";

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
    return <div className="loader"></div>;
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
              className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-foreground [&>option]:bg-card [&>option]:text-foreground"
              disabled={loadingColumns}
            >
              <option
                value=""
                className="bg-input-background dark:bg-input/30 text-foreground"
              >
                Wybierz kolumnę
              </option>
              {datasetColumns.map((column) => (
                <option
                  key={column}
                  value={column}
                  className="bg-red-500 dark:bg-input/30 text-foreground"
                >
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
              className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-card-foreground"
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
              className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-foreground [&>option]:bg-card [&>option]:text-foreground"
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
              className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-card-foreground"
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
              className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-foreground [&>option]:bg-card [&>option]:text-foreground"
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
              className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-card-foreground"
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
            className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-foreground [&>option]:bg-card [&>option]:text-foreground"
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
            className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-foreground [&>option]:bg-card [&>option]:text-foreground"
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
                    className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-foreground [&>option]:bg-card [&>option]:text-foreground"
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
                    className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-card-foreground"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 p-6 relative bg-background text-foreground overflow-y-auto">
        {/* Topbar */}
        <div className="flex justify-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg border border-border">
          <Button
            onClick={handleSaveDetails}
            variant="default"
            className="rounded-full px-6"
          >
            <Save className="h-4 w-4" />
            Zapisz zmiany
          </Button>

          <Button
            onClick={handleStartCalculation}
            variant="default"
            className="rounded-full px-6"
            disabled={hasUnsavedChanges}
            title={
              hasUnsavedChanges
                ? "Najpierw zapisz zmiany"
                : "Uruchom obliczenia"
            }
          >
            <Play className="h-4 w-4" />
            Uruchom obliczenia
          </Button>

          <Button
            onClick={handleDeleteProject}
            variant="destructive"
            className="rounded-full px-6"
          >
            <Trash2 className="h-4 w-4" />
            Usuń projekt
          </Button>
        </div>

        {/* Results Section */}
        {calculationResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Visualization Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    Wizualizacja wyników
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full min-h-[500px] overflow-auto bg-card rounded-lg p-6 border border-border">
                    <div
                      className="w-full flex items-center justify-center min-h-[450px]"
                      dangerouslySetInnerHTML={{
                        __html: calculationResult.svg_plot,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Model Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    Informacje o modelu
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                      <div className="space-y-4">
                        {typeof degree !== "undefined" && (
                          <div className="flex items-center justify-between p-4 bg-accent dark:bg-accent/50 rounded-lg">
                            <span className="text-base font-medium text-foreground">
                              Stopień wielomianu:
                            </span>
                            <span className="text-lg font-semibold text-foreground">
                              {degree}
                            </span>
                          </div>
                        )}
                        {typeof n_features !== "undefined" && (
                          <div className="flex items-center justify-between p-4 bg-accent dark:bg-accent/50 rounded-lg">
                            <span className="text-base font-medium text-foreground">
                              Liczba cech:
                            </span>
                            <span className="text-lg font-semibold text-foreground">
                              {n_features}
                            </span>
                          </div>
                        )}
                        {typeof r2 !== "undefined" && (
                          <div className="flex items-center justify-between p-4 bg-accent dark:bg-accent/50 rounded-lg">
                            <span className="text-base font-medium text-foreground">
                              Współczynnik determinacji (R²):
                            </span>
                            <span className="text-lg font-semibold text-foreground">
                              {typeof r2 === "number" ? r2.toFixed(4) : r2}
                            </span>
                          </div>
                        )}
                        {typeof intercept !== "undefined" && (
                          <div className="flex items-center justify-between p-4 bg-accent dark:bg-accent/50 rounded-lg">
                            <span className="text-base font-medium text-foreground">
                              Wyraz wolny (Intercept):
                            </span>
                            <span className="text-lg font-semibold text-foreground">
                              {typeof intercept === "number"
                                ? intercept.toFixed(4)
                                : intercept}
                            </span>
                          </div>
                        )}
                        {Array.isArray(coefficients) &&
                          coefficients.length > 0 && (
                            <div className="p-4 bg-accent dark:bg-accent/50 rounded-lg">
                              <div className="text-base font-medium text-foreground mb-3">
                                Współczynniki:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {coefficients.map((c: number, i: number) => (
                                  <div
                                    key={i}
                                    className="px-3 py-1.5 bg-card border border-border rounded-md text-base font-medium text-foreground"
                                  >
                                    β{i}:{" "}
                                    {typeof c === "number" ? c.toFixed(4) : c}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Predictions Card */}
            {calculationResult.prediction &&
              Array.isArray(calculationResult.prediction) &&
              calculationResult.prediction.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">
                      Przewidywania
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {calculationResult.prediction.map(
                          (pred: number, idx: number) => (
                            <div
                              key={idx}
                              className="p-2 bg-muted rounded-lg text-center text-sm font-medium"
                            >
                              {typeof pred === "number"
                                ? pred.toFixed(4)
                                : pred}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        )}

        {/* Loader */}
        <div className={`loader ${!loading ? "loader-hidden" : ""}`} />
      </div>
    </div>
  );
}
