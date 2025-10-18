import { useNavigate } from "react-router-dom";
// import { someData2 } from "../data"; // test data
import { useEffect, useState } from "react";
import CreateProjectWindow from "../components/CreateProjectWindow";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import {
  createProject,
  fetchProjects,
} from "../features/project/projectThunks";
import { formatDate } from "../utilis/functions";

function ProjectsPage() {
  const isLoggedIn = useSelector((state: any) => state.auth.isLoggedIn);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { projects } = useSelector((state: RootState) => state.project);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  if (!isLoggedIn) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">
          Musisz być zalogowany, aby zobaczyć swoje projekty.
        </h2>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (projectName.length >= 4) {
      try {
        const result = await dispatch(
          createProject({ name: projectName })
        ).unwrap();
        navigate(`/projects/${result.id}`);
      } catch (err) {
        console.error("Błąd tworzenia projektu:", err);
      }
    }
  };

  return (
    <div className="p-6 bg-background min-h-screen">
      <h2 className="text-2xl font-semibold mb-6">Moje Projekty</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {projects.map((proj) => (
          <button
            key={proj.id}
            onClick={() => navigate(`/projects/${proj.id}`)}
            className="cursor-pointer h-64 bg-card rounded shadow overflow-hidden border border-border hover:shadow-xl "
          >
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Tytuł: {proj.name}
              </h3>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Status:</strong>{" "}
                  {proj.isPublic ? (
                    <span className="text-green-600 font-medium">
                      Publiczny
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">Prywatny</span>
                  )}
                </p>
                <p>
                  <strong>Polubienia:</strong> {proj.likes}
                </p>
              </div>
            </div>

            <div className="mt-8 text-xs text-muted-foreground border-t pt-2">
              <p>Dodano: {formatDate(proj.createdAt)}</p>
              <p>Ostatnia modyfikacja: {formatDate(proj.lastModifiedAt)}</p>
            </div>
          </button>
        ))}
        <div
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center bg-muted rounded border-2 border-dashed border-border h-64 cursor-pointer hover:bg-muted/80"
        >
          <span className="text-5xl text-muted-foreground">+</span>
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
