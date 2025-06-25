import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { someData2 } from "../data"; // test data
import { useState } from "react";
import CreateProjectWindow from "../components/CreateProjectWindow";

function ProjectsPage() {
  const isLoggedIn = useSelector((state: any) => state.auth.isLoggedIn);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const navigate = useNavigate();

  if (!isLoggedIn) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">
          Musisz być zalogowany, aby zobaczyć swoje projekty.
        </h2>
      </div>
    );
  }

  const handleConfirm = () => {
    if (projectName.length >= 4) {
      navigate("/project");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-semibold mb-6">Moje Projekty</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {someData2.map((proj) => (
          <div
            key={proj.id}
            className="bg-white rounded shadow overflow-hidden border border-gray-200"
          >
            <img
              src={proj.image}
              alt="Projekt"
              className="w-full h-40 object-cover"
            />
            <div className="p-4">
              <h3 className="font-semibold text-lg">{proj.title}</h3>
              <p className="text-sm text-gray-600">{proj.description}</p>
              <div className="text-xs text-gray-500 mt-2">
                Dodano: {proj.date}
              </div>
            </div>
          </div>
        ))}
        <div
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center bg-gray-200 rounded border-2 border-dashed border-gray-400 h-64 cursor-pointer hover:bg-gray-300"
        >
          <span className="text-5xl text-gray-500">+</span>
        </div>
      </div>

      <CreateProjectWindow
        isOpen={isModalOpen}
        projectName={projectName}
        onChange={setProjectName}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default ProjectsPage;
