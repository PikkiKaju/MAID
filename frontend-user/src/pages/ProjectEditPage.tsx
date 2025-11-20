import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { ProjectDetail, ProjectMeta } from "../models/project";
import { datasetService, DatasetMetadata } from "../api/datasetService";
import { projectService, CalculationResult } from "../api/projectService";
import { useToast } from "../components/toast/ToastProvider";
import ProjectEditSidebar from "../components/project-edit/ProjectEditSidebar";
import ProjectEditTopbar from "../components/project-edit/ProjectEditTopbar";
import CalculationResults from "../components/project-edit/CalculationResults";
import { combineDatasets, isValidDatasetId } from "../utilis/projectHelpers";
import "../styles/Loader.css";

export default function ProjectEditPage() {
  const { id } = useParams();
  const location = useLocation();
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [datasetSearch] = useState("");
  const [datasetColumns, setDatasetColumns] = useState<string[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);
  const [loadingCalculation, setLoadingCalculation] = useState(false);

  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);
  const { showSuccess, showError } = useToast();

  // Get the source page from location state, default to "/" if not provided
  const fromPage = (location.state as { from?: string })?.from || "/";

  // Load project data
  useEffect(() => {
    if (!id || !token) return;

    projectService
      .getProject(id, token)
      .then((res) => {
        setMeta(res.meta);
        setDetail({
          ...res.detail,
          isPublic: res.meta.isPublic,
          status: res.meta.status ?? res.detail.status ?? 0, // Use status from meta or detail, default to 0 (draft)
        });
        setHasUnsavedChanges(false);
      })
      .catch(() => {
        showError("Błąd podczas ładowania projektu.");
      })
      .finally(() => setLoading(false));

    // Load available datasets
    datasetService
      .getAllDatasets(token)
      .then(({ public: publicDatasets, user: userDatasets }) => {
        setDatasets(combineDatasets(publicDatasets, userDatasets));
      })
      .catch(() => setDatasets([]));
  }, [id, token, showError]);

  // Fetch columns when dataset changes
  useEffect(() => {
    const fetchColumns = async () => {
      if (!meta?.datasetId || !token || !isValidDatasetId(meta.datasetId)) {
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

  const handleStartCalculation = async () => {
    if (!id || !detail) return;
    setLoadingCalculation(true);
    setCalculationResult(null);
    try {
      const result = await projectService.startCalculation(id, token!);
      setCalculationResult(result);
      showSuccess("Obliczenia zostały uruchomione");
    } catch {
      showError("Wystąpił błąd podczas obliczeń.");
    } finally {
      setLoadingCalculation(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!id || !detail || !meta) return;
    try {
      await projectService.updateProjectDetails(
        id,
        detail,
        meta.datasetId,
        token!
      );
      showSuccess("Zapisano zmiany w projekcie.");
      setHasUnsavedChanges(false);
    } catch {
      showError("Błąd podczas zapisywania zmian.");
    }
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    const confirmed = window.confirm("Czy na pewno chcesz usunąć ten projekt?");
    if (!confirmed) return;

    try {
      await projectService.deleteProject(id, token!);
      showSuccess("Projekt został usunięty.");
      navigate("/projects");
    } catch {
      showError("Wystąpił błąd podczas usuwania projektu.");
    }
  };

  const handleDatasetChange = async (newDatasetId: string) => {
    if (!meta || !id || !token) return;
    setMeta((meta) => meta && { ...meta, datasetId: newDatasetId });
    setDetail((detail) =>
      detail ? { ...detail, xColumn: "", yColumn: "" } : null
    );
    setHasUnsavedChanges(true);

    try {
      await projectService.updateProjectDataset(id, newDatasetId, token);
    } catch {
      showError("Błąd podczas zmiany datasetu.");
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
      <ProjectEditSidebar
        meta={meta}
        detail={detail}
        datasets={datasets}
        datasetColumns={datasetColumns}
        loadingColumns={loadingColumns}
        datasetSearch={datasetSearch}
        onDetailChange={setDetail}
        onDatasetChange={handleDatasetChange}
        onHasUnsavedChanges={() => setHasUnsavedChanges(true)}
        fromPage={fromPage}
      />

      <div className="flex-1 p-6 relative bg-background text-foreground overflow-y-auto">
        <ProjectEditTopbar
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSaveDetails}
          onStartCalculation={handleStartCalculation}
          onDelete={handleDeleteProject}
        />

        <CalculationResults
          result={calculationResult}
          loading={loadingCalculation}
        />
      </div>
    </div>
  );
}
