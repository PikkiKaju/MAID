import { Star } from "lucide-react";

// test data
const someData = [
  {
    id: 1,
    title: "Projekt AI",
    image: "https://placehold.co/300x150",
    description: "Gemini",
    date: "2025-06-12",
    author: "Jan Kowalski",
    likes: 134,
  },
  {
    id: 2,
    title: "Aplikacja NFZ",
    image: "https://placehold.co/300x150",
    description: "Przeglad serca",
    date: "2025-06-10",
    author: "Anna Nowak",
    likes: 98,
  },
];

function HomePage() {
  return (
    <div>
      <section className="p-6 bg-gray-100">
        <h2 className="text-2xl font-semibold mb-6">
          Ostatnio dodane projekty
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {someData.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded shadow overflow-hidden border border-gray-200"
            >
              <img
                src={project.image}
                alt="Projekt"
                className="w-full h-40 object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-bold">{project.title}</h3>
                <p className="text-sm text-gray-700">{project.description}</p>
                <div className="text-xs text-gray-500 mt-2">
                  Dodano: {project.date} | Autor: {project.author} |{" "}
                  <Star size={14} className="inline" /> {project.likes}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="p-6 bg-gray-100">
        <h2 className="text-2xl font-semibold mb-4">Najpopularniejsze</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {someData
            .sort((a, b) => b.likes - a.likes)
            .map((project) => (
              <div
                key={project.id}
                className="bg-white rounded shadow overflow-hidden border border-gray-200"
              >
                <img
                  src={project.image}
                  alt="Projekt"
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-bold">{project.title}</h3>
                  <p className="text-sm text-gray-700">{project.description}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    Dodano: {project.date} | Autor: {project.author} |{" "}
                    <Star size={14} className="inline" /> {project.likes}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
