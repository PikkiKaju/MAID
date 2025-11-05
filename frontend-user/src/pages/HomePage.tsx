import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { sampleProjects } from "../data";
import RecentSection from "../components/home/RecentSection";
import TrendingSection from "../components/home/TrendingSection";
import FavoritesSection from "../components/home/FavoritesSection";
import CategorySection from "../components/home/CategorySection";
import SearchResultsSection from "../components/home/SearchResultsSection";
import AttachedDatasets from "../components/datasets/AttachedDatasets";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { fetchPublicDatasets } from "../features/dataset/datasetThunks";
import { getFileIcon, getStatusColor, Dataset } from "../models/dataset";
import { Database } from "lucide-react";
// import { useNavigate } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";

//   const handleLike = async (projectId: string) => {
//     if (!token) return;
//     try {
//       await axiosInstance.put(
//         `/Project/${projectId}/like`,
//         "00000000-0000-0000-0000-000000000000", // Placeholder for project ID
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );
//       setLikedProjects((prev) => {
//         const updated = [...prev, projectId];
//         localStorage.setItem("likedProjects", JSON.stringify(updated));
//         return updated;
//       });
//       refetch();
//     } catch (e) {
//       alert("Nie udało się dodać polubienia.");
//     }
//   };

//   const formatDate = (dateString: string | undefined): string => {
//     if (!dateString) return "Brak daty";
//     try {
//       return new Date(dateString).toLocaleDateString("pl-PL", {
//         year: "numeric",
//         month: "long",
//         day: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       });
//     } catch (e) {
//       console.error("Błąd formatowania daty:", e);
//       return dateString;
//     }
//   };

export default function HomePage() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["1", "3"]));
  // const [isLoggedIn] = useState(true); // Simulate login state - change to false to test logged out state

  const dispatch = useAppDispatch();
  const searchTerm = useAppSelector((state) => state.search.term.toLowerCase());
  // const navigate = useNavigate();
  const { loading, error } = useProjects();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const publicDatasets = useAppSelector(
    (state) => state.dataset.publicDatasets
  );
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

  const { t } = useTranslation();

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

          {publicDatasets.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Publiczne Datasety</h2>
                </div>
              </div>
              <AttachedDatasets
                datasets={useMemo(() => {
                  return publicDatasets.map((dataset: Dataset) => {
                    const fileType = dataset.dataType === 0 ? "CSV" : "ZIP";

                    const uploadDate = new Date(
                      dataset.createdAt
                    ).toLocaleDateString("pl-PL", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return {
                      id: dataset.id,
                      name: dataset.name,
                      type: fileType,
                      status: "Ready",
                      uploadDate: uploadDate,
                      author: dataset.username,
                      likes: dataset.likes,
                      isPublic: dataset.isPublic,
                      isLiked: dataset.isLiked,
                    };
                  });
                }, [publicDatasets])}
                getFileIcon={getFileIcon}
                getStatusColor={getStatusColor}
                hideHeader={true}
              />
            </section>
          )}

          {isLoggedIn && favoriteProjects.length > 0 && (
            <FavoritesSection
              projects={favoriteProjects}
              favorites={favorites}
              handleFavoriteToggle={handleFavoriteToggle}
            />
          )}

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
