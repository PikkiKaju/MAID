import React from "react";
import { useTranslation } from "react-i18next";
import CategoryGrid from "./CategoryGrid";
import { Clock } from "lucide-react";
import { Button } from "../../ui/button";

import { Project } from "./CategorySection";

interface Props {
  projects: Project[];
  favorites: Set<string>;
  handleFavoriteToggle: (id: string) => void;
}

const RecentSection: React.FC<Props> = ({
  projects,
  favorites,
  handleFavoriteToggle,
}) => {
  const { t } = useTranslation();

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("home.recentProjects")}</h2>
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

export default RecentSection;
