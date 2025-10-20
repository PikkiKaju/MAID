import React from "react";
import CategoryGrid from "./CategoryGrid";
import { TrendingUp } from "lucide-react";
import { Button } from "../../ui/button";
import { Project } from "./CategorySection";

interface Props {
  projects: Project[];
  favorites: Set<string>;
  handleFavoriteToggle: (id: string) => void;
}

const TrendingSection: React.FC<Props> = ({
  projects,
  favorites,
  handleFavoriteToggle,
}) => {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Trending Projects</h2>
        </div>
        <Button variant="ghost" size="sm">
          View All
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

export default TrendingSection;
