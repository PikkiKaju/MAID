import { useTranslation } from "react-i18next";
import { FolderKanban } from "lucide-react";
import CategoryGrid from "./CategoryGrid";

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

  return (
    <section>
      <div className="flex items-center gap-2 mb-6">
        <FolderKanban className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">{t("home.allProjects")}</h2>
      </div>

      <CategoryGrid
        projects={projects}
        favorites={favorites}
        handleFavoriteToggle={handleFavoriteToggle}
      />
    </section>
  );
};

export default CategorySection;
