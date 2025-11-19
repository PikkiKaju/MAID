import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import RecentSection from "../components/home/RecentSection";
import TrendingSection from "../components/home/TrendingSection";
import FavoritesSection from "../components/home/FavoritesSection";
import CategorySection from "../components/home/CategorySection";
import SearchResultsSection from "../components/home/SearchResultsSection";
import PublicDatasetsSection from "../components/datasets/PublicDatasetsSection";
import FavoriteDatasetsSection from "../components/datasets/FavoriteDatasetsSection";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchPublicDatasets } from "../features/dataset/datasetThunks";
import { useProjects } from "../hooks/useProjects";
import { DisplayProject } from "../models/project";
import { likeProject } from "../features/project/projectThunks";
import { getUserIdFromToken } from "../utilis/tokenManager";
import { useToast } from "../components/toast/ToastProvider";
import { Project } from "../components/home/CategorySection";

// Transform DisplayProject to Project format used by components
const transformProject = (
  project: DisplayProject
): Project & { isLiked?: boolean; ownerAvatar?: string } => {
  return {
    id: project.id,
    title: project.name,
    description: project.description || "",
    author: project.ownerName || "Unknown",
    // Use lastModifiedAt as createdAt since API doesn't return createdAt
    createdAt: project.lastModifiedAt || project.createdAt || "",
    imageUrl:
      project.pictureUrl ||
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
    ownerAvatar: project.ownerAvatar,
    isLiked: project.isLiked,
  };
};

export default function HomePage() {
  // All hooks must be called at the top level, in the same order
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const searchTerm = useAppSelector((state) => state.search.term.toLowerCase());
  const { newProjects, popularProjects, allProjects, loading, error, refetch } =
    useProjects();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const token = useAppSelector((state) => state.auth.token);

  // Fetch public datasets on mount
  useEffect(() => {
    dispatch(fetchPublicDatasets());
  }, [dispatch]);

  // Transform projects to the format expected by components
  const transformedNewProjects = useMemo(
    () => newProjects.map(transformProject),
    [newProjects]
  );
  const transformedPopularProjects = useMemo(
    () => popularProjects.map(transformProject),
    [popularProjects]
  );
  const transformedAllProjects = useMemo(
    () => allProjects.map(transformProject),
    [allProjects]
  );

  // Filter projects by search term
  const filteredProjects = useMemo(() => {
    return transformedAllProjects.filter(
      (project) =>
        project.title.toLowerCase().includes(searchTerm) ||
        project.description.toLowerCase().includes(searchTerm)
    );
  }, [transformedAllProjects, searchTerm]);

  // Get favorite projects (liked projects)
  const favoriteProjects = useMemo(() => {
    return transformedAllProjects.filter((p) => {
      const originalProject = allProjects.find((proj) => proj.id === p.id);
      return originalProject?.isLiked === true;
    });
  }, [transformedAllProjects, allProjects]);

  const handleFavoriteToggle = async (projectId: string) => {
    if (!isLoggedIn || !token) {
      showError(t("projects.likeLoginRequired"));
      return;
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      showError("Nie udało się pobrać ID użytkownika.");
      return;
    }

    // Check if project is currently liked before toggling
    const currentProject = allProjects.find((p) => p.id === projectId);
    const wasLiked = currentProject?.isLiked === true;

    try {
      await dispatch(likeProject({ projectId, userId })).unwrap();
      // Refresh projects to update like status
      refetch();

      // Show appropriate message based on previous state
      if (wasLiked) {
        showSuccess(t("projects.unlikeSuccess"));
      } else {
        showSuccess(t("projects.likeSuccess"));
      }
    } catch (err: any) {
      console.error("Error liking project:", err);
      showError(err || t("projects.likeError"));
    }
  };

  const recentProjects = transformedNewProjects.slice(0, 6);
  const trendingProjects = transformedPopularProjects.slice(0, 6);

  return (
    <div>
      {searchTerm ? (
        <section className="p-6 bg-background">
          <h2 className="text-2xl font-semibold mb-6">
            {t("home.searchResults")}
          </h2>
          <SearchResultsSection
            projects={filteredProjects}
            favorites={new Set(favoriteProjects.map((p) => p.id))}
            handleFavoriteToggle={handleFavoriteToggle}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
          />
        </section>
      ) : (
        <div className="space-y-8">
          <RecentSection
            projects={recentProjects}
            favorites={new Set(favoriteProjects.map((p) => p.id))}
            handleFavoriteToggle={handleFavoriteToggle}
            loading={loading}
          />

          <TrendingSection
            projects={trendingProjects}
            favorites={new Set(favoriteProjects.map((p) => p.id))}
            handleFavoriteToggle={handleFavoriteToggle}
            loading={loading}
          />

          <PublicDatasetsSection />

          {isLoggedIn && favoriteProjects.length > 0 && (
            <FavoritesSection
              projects={favoriteProjects}
              favorites={new Set(favoriteProjects.map((p) => p.id))}
              handleFavoriteToggle={handleFavoriteToggle}
              loading={loading}
            />
          )}

          {isLoggedIn && <FavoriteDatasetsSection />}

          <CategorySection
            projects={transformedAllProjects}
            favorites={new Set(favoriteProjects.map((p) => p.id))}
            handleFavoriteToggle={handleFavoriteToggle}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
