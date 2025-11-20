import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { ProjectCard } from "../projects/ProjectCard";
import { HomeProject } from "../../models/project";

interface Props {
  projects: HomeProject[];
  favorites: Set<string>;
  handleFavoriteToggle: (projectId: string) => void;
}

export interface ProjectsCarouselRef {
  currentIndex: number;
  goToPrevious: () => void;
  goToNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

const ProjectsCarousel = forwardRef<ProjectsCarouselRef, Props>(
  ({ projects, favorites, handleFavoriteToggle }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const itemsPerPage = 3;
    const maxIndex = Math.max(0, projects.length - itemsPerPage);

    const goToPrevious = () => {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    };

    const goToNext = () => {
      setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
    };

    const canGoPrevious = currentIndex > 0;
    const canGoNext = currentIndex < maxIndex;

    useImperativeHandle(
      ref,
      () => ({
        currentIndex,
        goToPrevious,
        goToNext,
        canGoPrevious,
        canGoNext,
      }),
      [currentIndex, maxIndex]
    );

    // Reset index when projects change
    useEffect(() => {
      setCurrentIndex(0);
    }, [projects.length]);

    if (projects.length === 0) {
      return null;
    }

    // Calculate the width for each item (3 items per page with gap)
    // Each item takes 1/3 of the width minus gap spacing
    const gapSize = 24; // 6 * 4px (gap-6 = 1.5rem = 24px)
    const itemWidth = `calc((100% - ${
      (itemsPerPage - 1) * gapSize
    }px) / ${itemsPerPage})`;

    return (
      <div className="relative">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out gap-6 items-stretch"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
            }}
          >
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex-shrink-0 flex"
                style={{ width: itemWidth }}
              >
                <div className="w-full">
                  <ProjectCard
                    {...project}
                    isFavorited={project.isLiked === true}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

ProjectsCarousel.displayName = "ProjectsCarousel";

export default ProjectsCarousel;
