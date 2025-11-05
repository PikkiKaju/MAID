import { useMemo } from "react";
import { useAppSelector } from "../../store/hooks";
import { Dataset } from "../../models/dataset";
import { getFileIcon, getStatusColor } from "../../models/dataset";
import AttachedDatasets from "./AttachedDatasets";
import { Database } from "lucide-react";

export default function PublicDatasetsSection() {
  const publicDatasets = useAppSelector(
    (state) => state.dataset.publicDatasets
  );

  const formattedPublicDatasets = useMemo(() => {
    return publicDatasets.map((dataset: Dataset) => {
      const fileType = dataset.dataType === 0 ? "CSV" : "ZIP";

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
        isLiked: dataset.isLiked,
      };
    });
  }, [publicDatasets]);

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
      />
    </section>
  );
}
