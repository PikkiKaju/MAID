import React from "react";
import { useTranslation } from "react-i18next";
import CategoryGrid from "./CategoryGrid";
import { Star } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Project } from "./CategorySection";

interface Props {
  projects: Project[];
  favorites: Set<string>;
  handleFavoriteToggle: (id: string) => void;
}

const FavoritesSection: React.FC<Props> = ({
  projects,
  favorites,
  handleFavoriteToggle,
}) => {
  const { t } = useTranslation();
  const count = projects.length;

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
        <Button variant="ghost" size="sm">
          {t("home.viewAll")}
        </Button>
      </div>

      <CategoryGrid
        projects={projects}
        favorites={favorites}
        handleFavoriteToggle={handleFavoriteToggle}
      />
    </section>
  );
};

export default FavoritesSection;
