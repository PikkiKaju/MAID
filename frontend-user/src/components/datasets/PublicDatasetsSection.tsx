import { useMemo } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { Dataset } from "../../models/dataset";
import { getFileIcon, getStatusColor } from "../../models/dataset";
import AttachedDatasets from "./AttachedDatasets";
import { Database } from "lucide-react";
import { fetchPublicDatasets } from "../../features/dataset/datasetThunks";
import { datasetService } from "../../api/datasetService";
import { useToast } from "../toast/ToastProvider";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { formatUploadDate } from "../../utilis/functions";
import { useTranslation } from "react-i18next";

export default function PublicDatasetsSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const token = useSelector((state: RootState) => state.auth.token);
  const publicDatasets = useAppSelector(
    (state) => state.dataset.publicDatasets
  );

  const formattedPublicDatasets = useMemo(() => {
    return publicDatasets.map((dataset: Dataset) => {
      const fileType = dataset.dataType === 0 ? "CSV" : "ZIP";
      const uploadDate = formatUploadDate(dataset.createdAt);

      return {
        id: dataset.id,
        name: dataset.name,
        type: fileType,
        status: "Ready",
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
      <AttachedDatasets
        datasets={formattedPublicDatasets}
        getFileIcon={getFileIcon}
        getStatusColor={getStatusColor}
        hideHeader={true}
        onLike={handleLike}
        showLikeOption={true}
      />
    </section>
  );
}
