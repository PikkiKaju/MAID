import React from "react";
import { ProjectCard } from "../projects/ProjectCard";
import type { HomeProject } from "../../models/project";

interface Props {
  projects: HomeProject[];
  favorites: Set<string>;
  handleFavoriteToggle: (projectId: string) => void;
}

const CategoryGrid: React.FC<Props> = ({
  projects,
  favorites,
  handleFavoriteToggle,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          {...project}
          isFavorited={project.isLiked === true}
          onFavoriteToggle={handleFavoriteToggle}
        />
      ))}
    </div>
  );
};

export default CategoryGrid;
