import { useEffect, useState, useMemo } from "react";
import AttachedDatasets from "../components/datasets/AttachedDatasets";
import Tips from "../components/datasets/Tips";
import UploadArea from "../components/datasets/UploadArea";
import HeaderDatasets from "../components/datasets/HeaderDatasets";
import UploadDatasetDialog, {
  UploadFormData,
} from "../components/datasets/UploadDatasetDialog";
import DatasetDetailsDialog from "../components/datasets/DatasetDetailsDialog";
import { handleDrag, handleDrop } from "../utilis/drag-and-drop";
import { getFileIcon, getStatusColor } from "../models/dataset";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import {
  fetchPublicDatasets,
  fetchUserDatasets,
  uploadCsv,
  uploadPhoto,
} from "../features/dataset/datasetThunks";
import { datasetService } from "../api/datasetService";

export default function DatasetsListPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fileType, setFileType] = useState<"csv" | "zip" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);

  const validateFile = (
    file: File
  ): { valid: boolean; type: "csv" | "zip" | null; error?: string } => {
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf("."));

    if (extension === ".csv") {
      return { valid: true, type: "csv" };
    } else if (extension === ".zip") {
      return { valid: true, type: "zip" };
    } else {
      return {
        valid: false,
        type: null,
        error:
          "Nieprawidłowy format pliku. Dozwolone są tylko pliki .csv lub .zip",
      };
    }
  };

  const handleFileUpload = (files: FileList) => {
    if (files.length === 0) return;

    const file = files[0];
    const validation = validateFile(file);

    if (!validation.valid) {
      setUploadError(validation.error || "Nieprawidłowy plik");
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    setSelectedFile(file);
    setFileType(validation.type);
    setDialogOpen(true);
    setUploadError(null);
  };

  const handleDialogUpload = async (formData: UploadFormData) => {
    if (!selectedFile || !fileType || !token) {
      setUploadError("Brak wymaganych danych do przesłania pliku.");
      return;
    }

    try {
      if (fileType === "csv") {
        await dispatch(
          uploadCsv({
            file: selectedFile,
            name: formData.name,
            columnTransform: formData.columnTransform || "convert",
            emptyTransform: formData.emptyTransform || "average",
            isPublic: formData.isPublic,
          })
        ).unwrap();
      } else if (fileType === "zip") {
        await dispatch(
          uploadPhoto({
            file: selectedFile,
            name: formData.name,
            isPublic: formData.isPublic,
          })
        ).unwrap();
      }

      // Refresh datasets after successful upload
      dispatch(fetchUserDatasets());
      dispatch(fetchPublicDatasets());

      // Close dialog and reset state
      setDialogOpen(false);
      setSelectedFile(null);
      setFileType(null);
      alert("Plik został przesłany pomyślnie!");
    } catch (error: any) {
      setUploadError(error || "Błąd podczas przesyłania pliku.");
    }
  };

  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);

  // Datasets from Redux store
  const {
    publicDatasets,
    userDatasets,
    publicStatus,
    userStatus,
    uploadStatus,
    publicError,
    userError,
    uploadError: reduxUploadError,
  } = useSelector((state: RootState) => state.dataset);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch public datasets from Redux
  useEffect(() => {
    dispatch(fetchPublicDatasets());
  }, [dispatch]);

  // Fetch user datasets from Redux
  useEffect(() => {
    if (token) {
      dispatch(fetchUserDatasets());
    }
  }, [dispatch, token]);

  const handleDelete = async (id: string, name: string) => {
    if (!token) {
      alert("Musisz być zalogowany, aby usunąć dataset.");
      return;
    }

    try {
      setDeletingId(id);
      await datasetService.deleteDataset(id, token);
      // Refresh both datasets from Redux
      dispatch(fetchUserDatasets());
      dispatch(fetchPublicDatasets());
      alert("Dataset został usunięty pomyślnie.");
    } catch (err: any) {
      alert(
        "Błąd podczas usuwania datasetu: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewDetails = (
    datasetId: string,
    datasetName: string,
    datasetType: string
  ) => {
    // Only show details for CSV files
    if (datasetType === "CSV") {
      setSelectedDataset({
        id: datasetId,
        name: datasetName,
        type: datasetType,
      });
      setDetailsDialogOpen(true);
    } else {
      alert("Podgląd szczegółów jest dostępny tylko dla plików CSV.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <HeaderDatasets />

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag(setDragActive)}
        onDragLeave={handleDrag(setDragActive)}
        onDragOver={handleDrag(setDragActive)}
        onDrop={handleDrop(setDragActive, handleFileUpload)}
      >
        <UploadArea
          dragActive={dragActive}
          uploading={uploadStatus === "loading"}
          uploadProgress={uploadStatus === "loading" ? 50 : 0}
          onBrowseClick={() => {
            const input = document.getElementById(
              "file-input"
            ) as HTMLInputElement;
            if (input) {
              input.accept = ".csv,.zip";
              input.click();
            }
          }}
          onFileSelected={(files) => handleFileUpload(files)}
        />

        <input
          id="file-input"
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files);
            }
          }}
          accept=".csv,.zip"
        />

        <UploadDatasetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          file={selectedFile}
          fileType={fileType}
          onUpload={handleDialogUpload}
          isUploading={uploadStatus === "loading"}
        />
      </div>

      {/* Attached Datasets - My Datasets */}
      <AttachedDatasets
        datasets={useMemo(() => {
          return userDatasets.map((dataset) => {
            // Determine file type based on dataType (0 = CSV, assume ZIP for photos)
            const fileType = dataset.dataType === 0 ? "CSV" : "ZIP";

            // Format date
            const uploadDate = new Date(dataset.createdAt).toLocaleDateString(
              "pl-PL",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              }
            );

            return {
              id: dataset.id,
              name: dataset.name,
              type: fileType,
              status: "Ready",
              uploadDate: uploadDate,
              author: dataset.username,
              likes: dataset.likes,
              isPublic: dataset.isPublic,
            };
          });
        }, [userDatasets])}
        getFileIcon={getFileIcon}
        getStatusColor={getStatusColor}
        onDelete={handleDelete}
        onViewDetails={handleViewDetails}
      />

      {/* Dataset Details Dialog */}
      {selectedDataset && token && (
        <DatasetDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          datasetId={selectedDataset.id}
          datasetName={selectedDataset.name}
          token={token}
        />
      )}

      <Tips />
    </div>
  );
}
