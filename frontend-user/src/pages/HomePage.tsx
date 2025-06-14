import { Star } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

// testowe dane
const someData = [
  {
    id: 1,
    title: "Projekt AI",
    description: "Gemini",
    date: "2025-06-12",
    author: "Jan Kowalski",
    likes: 134,
  },
  {
    id: 2,
    title: "Aplikacja NFZ",
    description: "Przeglad serca",
    date: "2025-06-10",
    author: "Anna Nowak",
    likes: 98,
  },
];

function HomePage() {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
        <Topbar />

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Ostatnio dodane projekty
          </h2>
          <div className="grid gap-4">
            {someData.map((project) => (
              <div
                key={project.id}
                className="bg-white p-4 rounded shadow border border-gray-200"
              >
                <h3 className="text-lg font-bold">{project.title}</h3>
                <p className="text-sm text-gray-700">{project.description}</p>
                <div className="text-xs text-gray-500 mt-2">
                  Dodano: {project.date} | Autor: {project.author} |{" "}
                  <Star size={14} className="inline" /> {project.likes}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Najpopularniejsze</h2>
          <div className="grid gap-4">
            {someData
              .sort((a, b) => b.likes - a.likes)
              .map((project) => (
                <div
                  key={project.id}
                  className="bg-white p-4 rounded shadow border border-gray-200"
                >
                  <h3 className="text-lg font-bold">{project.title}</h3>
                  <p className="text-sm text-gray-700">{project.description}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    Dodano: {project.date} | Autor: {project.author} |{" "}
                    <Star size={14} className="inline" /> {project.likes}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default HomePage;
