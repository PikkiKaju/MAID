import React from "react";
import { useAppSelector } from "../store/hooks";
import { useNavigate } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import { DisplayProject } from "../models/project";

function HomePage() {
  const searchTerm = useAppSelector((state) => state.search.term.toLowerCase());
  const navigate = useNavigate();

  const { allProjects, newProjects, popularProjects, loading, error } =
    useProjects();

  const filteredProjects = allProjects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm)
  );

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "Brak daty";
    try {
      return new Date(dateString).toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Błąd formatowania daty:", e);
      return dateString;
    }
  };

  const ProjectCard: React.FC<{ project: DisplayProject }> = ({ project }) => (
    <button
      key={project.id}
      onClick={() => navigate(`/projects/${project.id}`)}
      className="cursor-pointer min-w-[300px] bg-white rounded shadow overflow-hidden border border-gray-200 hover:shadow-xl p-4 flex flex-col justify-between"
      style={{ height: "300px" }}
    >
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-6">
          Tytuł: {project.name}
        </h3>

        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Status:</strong>{" "}
            {project.isPublic ? (
              <span className="text-green-600 font-medium">Publiczny</span>
            ) : (
              <span className="text-red-600 font-medium">Prywatny</span>
            )}
          </p>
          <p>
            <strong>Polubienia:</strong> {project.likes}
          </p>
        </div>
      </div>

      <div className="mt-8 text-xs text-gray-500 border-t pt-2">
        <p>Dodano: {formatDate(project.createdAt)}</p>
        <p>Ostatnia modyfikacja: {formatDate(project.lastModifiedAt)}</p>
      </div>
    </button>
  );

  const renderProjectSection = (
    title: string,
    projects: DisplayProject[],
    limit?: number
  ) => {
    const dataToDisplay = limit ? projects.slice(0, limit) : projects;

    return (
      <section className="p-6 bg-gray-100">
        <h2 className="text-2xl font-semibold mb-4">{title}</h2>
        {loading ? (
          <div className="text-center text-gray-500 italic mt-10">
            Ładowanie projektów...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 italic mt-10">
            Błąd: {error}
          </div>
        ) : dataToDisplay.length === 0 ? (
          <div className="text-center text-gray-500 italic mt-10">
            Brak projektów do wyświetlenia.
          </div>
        ) : (
          <div className="flex overflow-x-auto space-x-5 pb-4 custom-scrollbar">
            {" "}
            {dataToDisplay.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    );
  };

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
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {renderProjectSection("Ostatnio dodane projekty", newProjects, 8)}{" "}
          {renderProjectSection("Najpopularniejsze", popularProjects, 8)}{" "}
          {renderProjectSection("Wszystkie projekty", allProjects)}{" "}
        </>
      )}
    </div>
  );
}

export default HomePage;
