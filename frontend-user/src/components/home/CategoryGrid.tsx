import React from "react";
import { ProjectCard } from "../../pages/ProjectCard";

export interface Project {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  category: string;
  imageUrl: string;
}

interface Props {
  projects: Project[];
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
          isFavorited={favorites.has(project.id)}
          onFavoriteToggle={handleFavoriteToggle}
        />
      ))}
    </div>
  );
};

export default CategoryGrid;
