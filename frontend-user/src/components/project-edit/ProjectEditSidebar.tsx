import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../ui/button";
import { ProjectDetail, ProjectMeta } from "../../models/project";
import { DatasetMetadata } from "../../api/datasetService";
import ColumnSelect from "./ColumnSelect";
import DatasetSelect from "./DatasetSelect";
import AlgorithmSelect from "./AlgorithmSelect";
import ParameterInputs from "./ParameterInputs";
import PublicCheckbox from "./PublicCheckbox";
import StatusSelect from "./StatusSelect";

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
  fromPage?: string;
  isReadOnly?: boolean;
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
  fromPage = "/",
  isReadOnly = false,
}: ProjectEditSidebarProps) {
  const handleDetailChange = (updates: Partial<ProjectDetail>) => {
    onDetailChange({ ...detail, ...updates });
    onHasUnsavedChanges();
  };

  const backPath = fromPage === "/projects" ? "/projects" : "/";
  const backLabel =
    fromPage === "/projects"
      ? "Powrót do projektów"
      : "Powrót do strony głównej";

  return (
    <div className="w-80 bg-card text-card-foreground p-6 shadow-md overflow-y-auto">
      <Button variant="ghost" asChild className="mb-4 flex items-center gap-2">
        <Link to={backPath}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
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
        disabled={isReadOnly}
      />

      <ColumnSelect
        label="X2 Column (opcjonalnie)"
        value={detail.x2Column || ""}
        columns={datasetColumns}
        loading={loadingColumns}
        datasetId={meta.datasetId}
        optional
        onChange={(value) => handleDetailChange({ x2Column: value })}
        disabled={isReadOnly}
      />

      <ColumnSelect
        label="Y Column"
        value={detail.yColumn}
        columns={datasetColumns}
        loading={loadingColumns}
        datasetId={meta.datasetId}
        onChange={(value) => handleDetailChange({ yColumn: value })}
        disabled={isReadOnly}
      />

      <PublicCheckbox
        checked={!!detail.isPublic}
        onChange={(checked) => handleDetailChange({ isPublic: checked })}
        disabled={isReadOnly}
      />

      <StatusSelect
        value={detail.status}
        onChange={(status) => handleDetailChange({ status })}
        disabled={isReadOnly}
      />

      <DatasetSelect
        value={meta.datasetId || ""}
        datasets={datasets}
        datasetSearch={datasetSearch}
        onChange={onDatasetChange}
        disabled={isReadOnly}
      />

      <AlgorithmSelect
        value={detail.algorithm}
        onChange={(value) => handleDetailChange({ algorithm: value })}
        disabled={isReadOnly}
      />

      <ParameterInputs
        algorithm={detail.algorithm}
        parameters={detail.parameters}
        onChange={(parameters) => handleDetailChange({ parameters })}
        onHasUnsavedChanges={onHasUnsavedChanges}
        disabled={isReadOnly}
      />
    </div>
  );
}
