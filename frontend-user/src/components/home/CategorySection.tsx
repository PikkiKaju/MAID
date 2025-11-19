import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FolderKanban } from "lucide-react";
import CategoryGrid from "./CategoryGrid";
import { Pagination } from "../../ui/pagination";

export interface Project {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  category: string;
  imageUrl: string;
  ownerAvatar?: string;
  isLiked?: boolean;
}

export interface ProjectListProps {
  projects: Project[];
  favorites: Set<string>;
  handleFavoriteToggle: (projectId: string) => void;
}

export const CategorySection: React.FC<ProjectListProps> = ({
  projects,
  favorites,
  handleFavoriteToggle,
}) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Pagination logic
  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = useMemo(
    () => projects.slice(startIndex, endIndex),
    [projects, startIndex, endIndex]
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
    </section>
  );
};

export default CategorySection;
