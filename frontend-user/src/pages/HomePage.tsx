import { useState } from "react";
import { sampleProjects } from "../data";
import RecentSection from "../components/home/RecentSection";
import TrendingSection from "../components/home/TrendingSection";
import FavoritesSection from "../components/home/FavoritesSection";
import CategorySection from "../components/home/CategorySection";
import SearchResultsSection from "../components/home/SearchResultsSection";
import { useAppSelector } from "../store/hooks";
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

  const searchTerm = useAppSelector((state) => state.search.term.toLowerCase());
  // const navigate = useNavigate();
  const { loading, error } = useProjects();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  // const token = useAppSelector((state) => state.auth.token);

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
          <h2 className="text-2xl font-semibold mb-6">Wyniki Wyszukiwania</h2>
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
