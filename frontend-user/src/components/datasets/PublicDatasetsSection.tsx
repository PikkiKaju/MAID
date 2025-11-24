import { useMemo, useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { Dataset } from "../../models/dataset";
import { getFileIcon } from "../../models/dataset";
import AttachedDatasets from "./AttachedDatasets";
import { Database, Loader2 } from "lucide-react";
import { fetchPublicDatasets } from "../../features/dataset/datasetThunks";
import { datasetService } from "../../api/datasetService";
import { useToast } from "../toast/ToastProvider";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { formatUploadDate } from "../../utils/functions";
import { useTranslation } from "react-i18next";
import DatasetDetailsDialog from "./DatasetDetailsDialog";
import { Pagination } from "../../ui/pagination";

export default function PublicDatasetsSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { showSuccess, showError, showInfo } = useToast();
  const token = useSelector((state: RootState) => state.auth.token);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const publicDatasets = useAppSelector(
    (state) => state.dataset.publicDatasets
  );
  const publicStatus = useAppSelector((state) => state.dataset.publicStatus);
  const isLoading = publicStatus === "loading";
  const [selectedDataset, setSelectedDataset] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const formattedPublicDatasets = useMemo(() => {
    if (!Array.isArray(publicDatasets)) {
      return [];
    }
    return publicDatasets.map((dataset: Dataset) => {
      const fileType = dataset.dataType === 0 ? "CSV" : "ZIP";
      const uploadDate = formatUploadDate(dataset.createdAt);

      return {
        id: dataset.id,
        name: dataset.name,
        type: fileType,
        uploadDate: uploadDate,
        author: dataset.username,
        likes: dataset.likes,
        isPublic: dataset.isPublic,
        isLiked: dataset.isLiked,
      };
    });
  }, [publicDatasets]);

  const handleLike = async (datasetId: string) => {
    if (!token) {
      showError(t("datasets.likeLoginRequired"));
      return;
    }

    try {
      await datasetService.likeDataset(datasetId, token);
      // Refresh public datasets to update like status
      dispatch(fetchPublicDatasets());
      showSuccess(t("datasets.likeSuccess"));
    } catch (err: any) {
      console.error("Error liking dataset:", err);
      showError(t("datasets.likeError"));
    }
  };

  // Handle view details for dataset
  const handleViewDetails = (
    datasetId: string,
    datasetName: string,
    datasetType: string
  ) => {
    // Check if user is logged in
    if (!isLoggedIn || !token) {
      showError(t("datasets.previewLoginRequired"));
      return;
    }

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

  // Pagination logic
  const totalPages = Math.ceil(formattedPublicDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDatasets = formattedPublicDatasets.slice(startIndex, endIndex);

  // Reset to page 1 when datasets change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [formattedPublicDatasets.length, currentPage, totalPages]);

  if (formattedPublicDatasets.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Publiczne Datasety</h2>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <AttachedDatasets
            datasets={paginatedDatasets}
            getFileIcon={getFileIcon}
            hideHeader={true}
            onLike={handleLike}
            showLikeOption={true}
            onViewDetails={handleViewDetails}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={formattedPublicDatasets.length}
          />
        </>
      )}

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
    </section>
  );
}
