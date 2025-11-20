import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import CategoryGrid from "./CategoryGrid";
import { Star, Loader2 } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Pagination } from "../../ui/pagination";
import { calculatePagination } from "../../utils/projectHelpers";
import type { HomeProject } from "../../models/project";

interface Props {
  projects: HomeProject[];
  favorites: Set<string>;
  handleFavoriteToggle: (id: string) => void;
  loading?: boolean;
}

const FavoritesSection: React.FC<Props> = ({
  projects,
  favorites,
  handleFavoriteToggle,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const count = projects.length;

  // Pagination logic
  const { totalPages, paginatedItems: paginatedProjects } = calculatePagination(
    projects,
    currentPage,
    itemsPerPage
  );

  // Reset to page 1 when projects change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [projects.length, currentPage, totalPages]);

  return (
    <section className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-purple-600 fill-purple-600" />
          <h2 className="text-xl font-semibold">
            {t("home.favoriteProjects")}
          </h2>
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
          >
            {count}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <CategoryGrid
            projects={paginatedProjects}
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={projects.length}
          />
        </>
      )}
    </section>
  );
};

export default FavoritesSection;
