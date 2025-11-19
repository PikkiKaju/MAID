import { useEffect, useState, useMemo } from "react";
import { Pagination } from "../ui/pagination";
import AttachedDatasets from "../components/datasets/AttachedDatasets";
import Tips from "../components/datasets/Tips";
import UploadArea from "../components/datasets/UploadArea";
import HeaderDatasets from "../components/datasets/HeaderDatasets";
import UploadDatasetDialog, {
  UploadFormData,
} from "../components/datasets/UploadDatasetDialog";
import DatasetDetailsDialog from "../components/datasets/DatasetDetailsDialog";
import { handleDrag, handleDrop } from "../utilis/drag-and-drop";
import { formatUploadDate } from "../utilis/functions";
import { getFileIcon } from "../models/dataset";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import {
  fetchPublicDatasets,
  fetchUserDatasets,
  uploadCsv,
  uploadPhoto,
} from "../features/dataset/datasetThunks";
import { datasetService } from "../api/datasetService";
import { useToast } from "../components/toast/ToastProvider";
import { useTranslation } from "react-i18next";

export default function DatasetsListPage() {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fileType, setFileType] = useState<"csv" | "zip" | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Validate file extension and pass only matches files that are .csv or .zip
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
        error: t("datasets.invalidFileFormat"),
      };
    }
  };

  // Handle file upload to global state
  const handleFileUpload = (files: FileList) => {
    if (files.length === 0) return;

    const file = files[0];
    const validation = validateFile(file);

    if (!validation.valid) {
      const errorMessage = validation.error || t("datasets.invalidFile");
      showError(errorMessage);
      return;
    }

    setSelectedFile(file);
    setFileType(validation.type);
    setDialogOpen(true);
  };

  // Handle file upload to database and refresh datasets in Redux store after successful upload
  const handleDialogUpload = async (formData: UploadFormData) => {
    if (!selectedFile || !fileType || !token) {
      const errorMessage = t("datasets.missingUploadData");
      showError(errorMessage);
      return;
    }

    try {
      if (fileType === "csv") {
        await dispatch(
          uploadCsv({
            file: selectedFile,
            name: formData.name,
            columnTransform: formData.columnTransform || "remove",
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
      showSuccess(t("datasets.uploadSuccess"));
    } catch (error: any) {
      const errorMessage = error?.message || t("datasets.uploadError");
      showError(errorMessage);
    }
  };

  // Dispatch to Redux store
  const dispatch = useDispatch<AppDispatch>();
  // Token from Redux store
  const token = useSelector((state: RootState) => state.auth.token);

  // Datasets from Redux store
  const { userDatasets, uploadStatus } = useSelector(
    (state: RootState) => state.dataset
  );

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

  // Format datasets
  const formattedDatasets = useMemo(() => {
    return userDatasets.map((dataset) => {
      // Determine file type (0 = CSV, 1 = ZIP)
      const fileType = dataset.dataType === 0 ? "CSV" : "ZIP";

      // Format date
      const uploadDate = formatUploadDate(dataset.createdAt);

      return {
        id: dataset.id,
        name: dataset.name,
        type: fileType,
        uploadDate: uploadDate,
        author: dataset.username,
        likes: dataset.likes,
        isPublic: dataset.isPublic,
      };
    });
  }, [userDatasets]);

  // Pagination logic
  const totalPages = Math.ceil(formattedDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDatasets = formattedDatasets.slice(startIndex, endIndex);

  // Reset to page 1 when datasets change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [formattedDatasets.length, currentPage, totalPages]);

  // Handle delete dataset from database and refresh datasets in Redux store after successful delete
  const handleDelete = async (id: string) => {
    if (!token) {
      showError(t("datasets.loginRequiredDelete"));
      return;
    }

    try {
      await datasetService.deleteDataset(id, token);
      // Refresh both datasets from Redux
      dispatch(fetchUserDatasets());
      dispatch(fetchPublicDatasets());
      showSuccess(t("datasets.deleteSuccess"));
    } catch (err: any) {
      const errorMessage = t("datasets.deleteError", {
        message: err.response?.data?.message || err.message,
      });
      showError(errorMessage);
    }
  };

  // Handle view details for dataset
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
      showInfo(t("datasets.csvOnlyDetails"));
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
        datasets={paginatedDatasets}
        getFileIcon={getFileIcon}
        onDelete={handleDelete}
        onViewDetails={handleViewDetails}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={formattedDatasets.length}
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
