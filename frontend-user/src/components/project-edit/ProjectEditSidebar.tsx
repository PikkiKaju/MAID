import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../ui/button";
import { ProjectDetail, ProjectMeta } from "../../models/project";
import { DatasetMetadata } from "../../api/datasetService";
import ColumnSelect from "./ColumnSelect";
import DatasetSelect from "./DatasetSelect";
import AlgorithmSelect from "./AlgorithmSelect";
import ParameterInputs from "./ParameterInputs";
import PublicCheckbox from "./PublicCheckbox";

interface ProjectEditSidebarProps {
  meta: ProjectMeta;
  detail: ProjectDetail;
  datasets: DatasetMetadata[];
  datasetColumns: string[];
  loadingColumns: boolean;
  datasetSearch: string;
  onDetailChange: (detail: ProjectDetail) => void;
  onDatasetChange: (value: string) => void;
  onHasUnsavedChanges: () => void;
}

export default function ProjectEditSidebar({
  meta,
  detail,
  datasets,
  datasetColumns,
  loadingColumns,
  datasetSearch,
  onDetailChange,
  onDatasetChange,
  onHasUnsavedChanges,
}: ProjectEditSidebarProps) {
  const navigate = useNavigate();

  const handleDetailChange = (updates: Partial<ProjectDetail>) => {
    onDetailChange({ ...detail, ...updates });
    onHasUnsavedChanges();
  };

  return (
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

      <ColumnSelect
        label="X Column"
        value={detail.xColumn}
        columns={datasetColumns}
        loading={loadingColumns}
        datasetId={meta.datasetId}
        onChange={(value) => handleDetailChange({ xColumn: value })}
      />

      <ColumnSelect
        label="X2 Column (opcjonalnie)"
        value={detail.x2Column || ""}
        columns={datasetColumns}
        loading={loadingColumns}
        datasetId={meta.datasetId}
        optional
        onChange={(value) => handleDetailChange({ x2Column: value })}
      />

      <ColumnSelect
        label="Y Column"
        value={detail.yColumn}
        columns={datasetColumns}
        loading={loadingColumns}
        datasetId={meta.datasetId}
        onChange={(value) => handleDetailChange({ yColumn: value })}
      />

      <PublicCheckbox
        checked={!!detail.isPublic}
        onChange={(checked) => handleDetailChange({ isPublic: checked })}
      />

      <DatasetSelect
        value={meta.datasetId || ""}
        datasets={datasets}
        datasetSearch={datasetSearch}
        onChange={onDatasetChange}
      />

      <AlgorithmSelect
        value={detail.algorithm}
        onChange={(value) => handleDetailChange({ algorithm: value })}
      />

      <ParameterInputs
        algorithm={detail.algorithm}
        parameters={detail.parameters}
        onChange={(parameters) => handleDetailChange({ parameters })}
        onHasUnsavedChanges={onHasUnsavedChanges}
      />
    </div>
  );
}
