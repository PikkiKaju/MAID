import { useMemo, useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { Dataset } from "../../models/dataset";
import { getFileIcon } from "../../models/dataset";
import AttachedDatasets from "./AttachedDatasets";
import { Star, Loader2 } from "lucide-react";
import { Badge } from "../../ui/badge";
import { fetchPublicDatasets } from "../../features/dataset/datasetThunks";
import { datasetService } from "../../api/datasetService";
import { useToast } from "../toast/ToastProvider";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { formatUploadDate } from "../../utilis/functions";
import { useTranslation } from "react-i18next";
import DatasetDetailsDialog from "./DatasetDetailsDialog";
import { Pagination } from "../../ui/pagination";

export default function FavoriteDatasetsSection() {
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
  const itemsPerPage = 3;

  // Filter only liked datasets
  const favoriteDatasets = useMemo(() => {
    return publicDatasets.filter(
      (dataset: Dataset) => dataset.isLiked === true
    );
  }, [publicDatasets]);

  const formattedFavoriteDatasets = useMemo(() => {
    return favoriteDatasets.map((dataset: Dataset) => {
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
  }, [favoriteDatasets]);

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
  const totalPages = Math.ceil(formattedFavoriteDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDatasets = formattedFavoriteDatasets.slice(
    startIndex,
    endIndex
  );

  // Reset to page 1 when datasets change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [formattedFavoriteDatasets.length, currentPage, totalPages]);

  // Don't show section if no favorite datasets
  if (formattedFavoriteDatasets.length === 0) {
    return null;
  }

  const count = formattedFavoriteDatasets.length;

  return (
    <section className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-purple-600 fill-purple-600" />
          <h2 className="text-xl font-semibold">
            {t("home.favoriteDatasets")}
          </h2>
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
          >
            {count}
          </Badge>
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
            totalItems={formattedFavoriteDatasets.length}
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
