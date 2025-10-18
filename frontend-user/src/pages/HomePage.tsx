import { useState } from "react";
import { sampleProjects } from "../data";
import { ChevronRight, Clock, Filter, Star, TrendingUp } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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

function HomePage() {
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
        <section className="p-6 bg-gray-100">
          <h2 className="text-2xl font-semibold mb-6">Wyniki Wyszukiwania</h2>
          {loading ? (
            <div className="text-center text-gray-500 italic mt-10">
              Ładowanie wyników...
            </div>
          ) : error ? (
            <div className="text-center text-red-500 italic mt-10">
              Błąd: {error}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center text-gray-500 italic mt-10">
              Brak wyników wyszukiwania dla "<strong>{searchTerm}</strong>".
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {" "}
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} {...project} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Recent Projects</h2>
              </div>
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  {...project}
                  isFavorited={favorites.has(project.id)}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Trending Projects</h2>
              </div>
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  {...project}
                  isFavorited={favorites.has(project.id)}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          </section>

          {isLoggedIn && favoriteProjects.length > 0 && (
            <section className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-600 fill-purple-600" />
                  <h2 className="text-xl font-semibold">Moje ulubione</h2>
                  <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  >
                    {favoriteProjects.length}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    {...project}
                    isFavorited={true}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Browse by Category</h2>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="ml">ML</TabsTrigger>
                <TabsTrigger value="dl">Deep Learning</TabsTrigger>
                <TabsTrigger value="cv">Computer Vision</TabsTrigger>
                <TabsTrigger value="nlp">NLP</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      {...project}
                      isFavorited={favorites.has(project.id)}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="ml" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleProjects
                    .filter((p) => p.category === "ML")
                    .map((project) => (
                      <ProjectCard
                        key={project.id}
                        {...project}
                        isFavorited={favorites.has(project.id)}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="dl" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleProjects
                    .filter((p) => p.category === "Deep Learning")
                    .map((project) => (
                      <ProjectCard
                        key={project.id}
                        {...project}
                        isFavorited={favorites.has(project.id)}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="cv" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleProjects
                    .filter((p) => p.category === "Computer Vision")
                    .map((project) => (
                      <ProjectCard
                        key={project.id}
                        {...project}
                        isFavorited={favorites.has(project.id)}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="nlp" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleProjects
                    .filter((p) => p.category === "NLP")
                    .map((project) => (
                      <ProjectCard
                        key={project.id}
                        {...project}
                        isFavorited={favorites.has(project.id)}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleProjects
                    .filter((p) => p.category === "Analytics")
                    .map((project) => (
                      <ProjectCard
                        key={project.id}
                        {...project}
                        isFavorited={favorites.has(project.id)}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      )}
    </div>
  );
}

export default HomePage;
