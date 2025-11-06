import { useTranslation } from "react-i18next";
import { Search, Plus } from "lucide-react";
import { Button } from "../../ui/button";

interface Props {
  searchTerm: string;
  statusFilter: string;
  onCreate?: () => void;
}

export default function EmptyState({
  searchTerm,
  statusFilter,
  onCreate,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {t("projects.emptyStateNoResults")}
      </h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm || statusFilter !== "all"
          ? t("projects.emptyStateDescription")
          : t("projects.emptyStateCreate")}
      </p>
      {!searchTerm && statusFilter === "all" && (
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("projects.createFirstProject")}
        </Button>
      )}
    </div>
  );
}
