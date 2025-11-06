import React from "react";
import { useTranslation } from "react-i18next";
import CategoryGrid from "./CategoryGrid";
import { Project } from "./CategorySection";

interface Props {
  projects: Project[];
  favorites: Set<string>;
  handleFavoriteToggle: (id: string) => void;
  loading: boolean;
  error: string | null;
  searchTerm: string;
}

const SearchResultsSection: React.FC<Props> = ({
  projects,
  favorites,
  handleFavoriteToggle,
  loading,
  error,
  searchTerm,
}) => {
  const { t } = useTranslation();

  if (loading)
    return (
      <div className="text-center text-muted-foreground italic mt-10">
        {t("common.loading")}
      </div>
    );
  if (error)
    return (
      <div className="text-center text-red-500 italic mt-10">
        {t("common.error")}: {error}
      </div>
    );
  if (projects.length === 0)
    return (
      <div className="text-center text-muted-foreground italic mt-10">
        {t("home.noResults")} "{searchTerm}"
      </div>
    );

  return (
    <CategoryGrid
      projects={projects}
      favorites={favorites}
      handleFavoriteToggle={handleFavoriteToggle}
    />
  );
};

export default SearchResultsSection;
