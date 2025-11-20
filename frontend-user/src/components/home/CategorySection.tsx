import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FolderKanban, Loader2 } from "lucide-react";
import CategoryGrid from "./CategoryGrid";
import { Pagination } from "../../ui/pagination";
import { calculatePagination } from "../../utils/projectHelpers";
import type { HomeProject } from "../../models/project";

export interface ProjectListProps {
  projects: HomeProject[];
  favorites: Set<string>;
  handleFavoriteToggle: (projectId: string) => void;
  loading?: boolean;
}

export const CategorySection: React.FC<ProjectListProps> = ({
  projects,
  favorites,
  handleFavoriteToggle,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

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
    <section id="all-projects-section">
      <div className="flex items-center gap-2 mb-6">
        <FolderKanban className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">{t("home.allProjects")}</h2>
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

export default CategorySection;
