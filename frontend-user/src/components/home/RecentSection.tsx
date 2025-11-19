import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ProjectsCarousel, { ProjectsCarouselRef } from "./ProjectsCarousel";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
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
  const carouselRef = useRef<ProjectsCarouselRef>(null);
  const [canGoPrevious, setCanGoPrevious] = useState(false);
  const [canGoNext, setCanGoNext] = useState(projects.length > 3);

  // Update navigation state when ref changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        setCanGoPrevious(carouselRef.current.canGoPrevious);
        setCanGoNext(carouselRef.current.canGoNext);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handlePrevious = () => {
    carouselRef.current?.goToPrevious();
  };

  const handleNext = () => {
    carouselRef.current?.goToNext();
  };

  const handleViewAll = () => {
    const allProjectsSection = document.getElementById("all-projects-section");
    if (allProjectsSection) {
      allProjectsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("home.recentProjects")}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleViewAll}>
            {t("home.viewAll")}
          </Button>
          {projects.length > 3 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleNext}
                disabled={!canGoNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <ProjectsCarousel
        ref={carouselRef}
        projects={projects}
        favorites={favorites}
        handleFavoriteToggle={handleFavoriteToggle}
      />
    </section>
  );
};

export default RecentSection;
