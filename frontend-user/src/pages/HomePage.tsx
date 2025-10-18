// import React, { useState } from "react";
// import { useAppSelector } from "../store/hooks";
// import { useNavigate } from "react-router-dom";
// import { useProjects } from "../hooks/useProjects";
// import { DisplayProject } from "../models/project";
// import axiosInstance from "../api/axiosConfig";

import { useState } from "react";
import { sampleProjects } from "../data";
import { ChevronRight, Clock, Filter, Star, TrendingUp } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

// function HomePage() {
//   const searchTerm = useAppSelector((state) => state.search.term.toLowerCase());
//   const navigate = useNavigate();
//   const { allProjects, newProjects, popularProjects, loading, error, refetch } =
//     useProjects();
//   const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
//   const token = useAppSelector((state) => state.auth.token);
//   const [likedProjects, setLikedProjects] = useState<string[]>(() => {
//     const stored = localStorage.getItem("likedProjects");
//     return stored ? JSON.parse(stored) : [];
//   });

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

//   const filteredProjects = allProjects.filter((project) =>
//     project.name.toLowerCase().includes(searchTerm)
//   );

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

//   const ProjectCard: React.FC<{ project: DisplayProject }> = ({ project }) => {
//     const isLiked = likedProjects.includes(project.id);
//     return (
//       <div
//         key={project.id}
//         onDoubleClick={() => navigate(`/projects/${project.id}`)}
//         className="min-w-[300px] bg-white rounded shadow overflow-hidden border border-gray-200 hover:shadow-xl p-4 flex flex-col justify-between"
//         style={{ height: "300px" }}
//       >
//         <div>
//           <h3 className="text-xl font-semibold text-gray-800 mb-6">
//             Tytuł: {project.name}
//           </h3>
//           <div className="text-sm text-gray-600 space-y-1">
//             <p>
//               <strong>Status:</strong>{" "}
//               {project.isPublic ? (
//                 <span className="text-green-600 font-medium">Publiczny</span>
//               ) : (
//                 <span className="text-red-600 font-medium">Prywatny</span>
//               )}
//             </p>
//             <p>
//               <strong>Polubienia:</strong> {project.likes}
//             </p>
//           </div>
//         </div>
//         <div className="mt-8 text-xs text-gray-500 border-t pt-2 flex justify-between items-center">
//           <div>
//             <p>Dodano: {formatDate(project.createdAt)}</p>
//             <p>Ostatnia modyfikacja: {formatDate(project.lastModifiedAt)}</p>
//           </div>
//           {isLoggedIn && (
//             <button
//               className={`ml-2 px-3 py-1 rounded ${
//                 isLiked
//                   ? "bg-gray-400 text-white"
//                   : "bg-pink-500 text-white hover:bg-pink-600"
//               }`}
//               onClick={() => handleLike(project.id)}
//               disabled={isLiked}
//             >
//               {isLiked ? "Polubiono" : "Lubię to"}
//             </button>
//           )}
//         </div>
//       </div>
//     );
//   };

//   const renderProjectSection = (
//     title: string,
//     projects: DisplayProject[],
//     limit?: number
//   ) => {
//     const dataToDisplay = limit ? projects.slice(0, limit) : projects;

//     return (
//       <section className="p-6 bg-gray-100">
//         <h2 className="text-2xl font-semibold mb-4">{title}</h2>
//         {loading ? (
//           <div className="text-center text-gray-500 italic mt-10">
//             Ładowanie projektów...
//           </div>
//         ) : error ? (
//           <div className="text-center text-red-500 italic mt-10">
//             Błąd: {error}
//           </div>
//         ) : dataToDisplay.length === 0 ? (
//           <div className="text-center text-gray-500 italic mt-10">
//             Brak projektów do wyświetlenia.
//           </div>
//         ) : (
//           <div className="flex overflow-x-auto space-x-5 pb-4 custom-scrollbar">
//             {" "}
//             {dataToDisplay.map((project) => (
//               <ProjectCard key={project.id} project={project} />
//             ))}
//           </div>
//         )}
//       </section>
//     );
//   };

//   return (
//     <div>
//       {searchTerm ? (
//         <section className="p-6 bg-gray-100">
//           <h2 className="text-2xl font-semibold mb-6">Wyniki Wyszukiwania</h2>
//           {loading ? (
//             <div className="text-center text-gray-500 italic mt-10">
//               Ładowanie wyników...
//             </div>
//           ) : error ? (
//             <div className="text-center text-red-500 italic mt-10">
//               Błąd: {error}
//             </div>
//           ) : filteredProjects.length === 0 ? (
//             <div className="text-center text-gray-500 italic mt-10">
//               Brak wyników wyszukiwania dla "<strong>{searchTerm}</strong>".
//             </div>
//           ) : (
//             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
//               {" "}
//               {filteredProjects.map((project) => (
//                 <ProjectCard key={project.id} project={project} />
//               ))}
//             </div>
//           )}
//         </section>
//       ) : (
//         <>
//           {renderProjectSection("Ostatnio dodane projekty", newProjects, 8)}{" "}
//           {renderProjectSection("Najpopularniejsze", popularProjects, 8)}{" "}
//           {renderProjectSection("Wszystkie projekty", allProjects)}{" "}
//         </>
//       )}
//     </div>
//   );
// }

// export default HomePage;

function HomePage() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["1", "3"]));
  const [isLoggedIn] = useState(true); // Simulate login state - change to false to test logged out state

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
  );
}

export default HomePage;
