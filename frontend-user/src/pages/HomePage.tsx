import { Star } from "lucide-react";
import { someData } from "../data"; // test data
import { useAppSelector } from "../store/hooks";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const searchTerm = useAppSelector((state) => state.search.term.toLowerCase());
  const navigate = useNavigate();

  const filteredProjects = someData.filter((project) =>
    project.title.toLowerCase().includes(searchTerm)
  );

  return (
    <div>
      {searchTerm ? (
        <>
          <section className="p-6 bg-gray-100">
            <h2 className="text-2xl font-semibold mb-6">Wyniki Wyszukiwania</h2>
            {filteredProjects.length === 0 ? (
              <div className="text-center text-gray-500 italic mt-10">
                Brak wyników wyszukiwania dla "<strong>{searchTerm}</strong>".
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="cursor-pointer bg-white rounded shadow overflow-hidden border border-gray-200 hover:shadow-xl"
                  >
                    <img
                      src={project.image}
                      alt="Projekt"
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="text-lg font-bold">{project.title}</h3>
                      <p className="text-sm text-gray-700">
                        {project.description}
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        Dodano: {project.date} | Autor: {project.author} |{" "}
                        <Star size={14} className="inline" /> {project.likes}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="p-6 bg-gray-100">
            <h2 className="text-2xl font-semibold mb-6">
              Ostatnio dodane projekty
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {someData.map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="cursor-pointer bg-white rounded shadow overflow-hidden border border-gray-200 hover:shadow-xl"
                >
                  <img
                    src={project.image}
                    alt="Projekt"
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-bold">{project.title}</h3>
                    <p className="text-sm text-gray-700">
                      {project.description}
                    </p>
                    <div className="text-xs text-gray-500 mt-2">
                      Dodano: {project.date} | Autor: {project.author} |{" "}
                      <Star size={14} className="inline" /> {project.likes}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="p-6 bg-gray-100">
            <h2 className="text-2xl font-semibold mb-4">Najpopularniejsze</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {someData
                .sort((a, b) => b.likes - a.likes)
                .map((project) => (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="cursor-pointer bg-white rounded shadow overflow-hidden border border-gray-200 hover:shadow-xl"
                  >
                    <img
                      src={project.image}
                      alt="Projekt"
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="text-lg font-bold">{project.title}</h3>
                      <p className="text-sm text-gray-700">
                        {project.description}
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        Dodano: {project.date} | Autor: {project.author} |{" "}
                        <Star size={14} className="inline" /> {project.likes}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default HomePage;
