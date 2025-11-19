import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { sampleProjects } from "../data";
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

export default function HomePage() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["1", "3"]));
  // const [isLoggedIn] = useState(true); // Simulate login state - change to false to test logged out state

  // All hooks must be called at the top level, in the same order
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const searchTerm = useAppSelector((state) => state.search.term.toLowerCase());
  // const navigate = useNavigate();
  const { loading, error } = useProjects();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  // const token = useAppSelector((state) => state.auth.token);

  // Fetch public datasets on mount
  useEffect(() => {
    dispatch(fetchPublicDatasets());
  }, [dispatch]);

  const filteredProjects = sampleProjects.filter((project) =>
    project.title.toLowerCase().includes(searchTerm)
  );

  const handleFavoriteToggle = (projectId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(projectId)) {
      newFavorites.delete(projectId);
    } else {
      newFavorites.add(projectId);
    }
    setFavorites(newFavorites);
  };

  const recentProjects = sampleProjects.slice(0, 3);
  const trendingProjects = sampleProjects.slice(1, 4);
  const favoriteProjects = sampleProjects.filter((p) => favorites.has(p.id));

  return (
    <div>
      {searchTerm ? (
        <section className="p-6 bg-background">
          <h2 className="text-2xl font-semibold mb-6">
            {t("home.searchResults")}
          </h2>
          <SearchResultsSection
            projects={filteredProjects}
            favorites={favorites}
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
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />

          <TrendingSection
            projects={trendingProjects}
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />

          <PublicDatasetsSection />

          {isLoggedIn && favoriteProjects.length > 0 && (
            <FavoritesSection
              projects={favoriteProjects}
              favorites={favorites}
              handleFavoriteToggle={handleFavoriteToggle}
            />
          )}

          {isLoggedIn && <FavoriteDatasetsSection />}

          <CategorySection
            projects={sampleProjects}
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />
        </div>
      )}
    </div>
  );
}
