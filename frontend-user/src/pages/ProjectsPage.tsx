import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CreateProjectWindow from "../components/profile/CreateProjectWindow";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../store/store";
import {
  createProject,
  fetchProjects,
} from "../features/project/projectThunks";
import { userProjects } from "../data";
import HeaderProfile from "../components/profile/HeaderProfile";
import FiltersAndSearch from "../components/profile/FiltersAndSearch";
import ProjectsGrid from "../components/profile/ProjectsGrid";
import EmptyState from "../components/profile/EmptyState";
import DeleteConfirmationDialog from "../components/profile/DeleteConfirmationDialog";

function ProjectsPage() {
  // const isLoggedIn = useSelector((state: any) => state.auth.isLoggedIn);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  // const { projects } = useSelector((state: RootState) => state.project);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("modified");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    project: any;
  }>({ open: false, project: null });
  const [projectsData, setProjectsData] = useState(userProjects);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  // if (!isLoggedIn) {
  //   return (
  //     <div className="p-6">
  //       <h2 className="text-xl font-semibold">
  //         Musisz być zalogowany, aby zobaczyć swoje projekty.
  //       </h2>
  //     </div>
  //   );
  // }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";
      case "Draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleVisibilityToggle = (projectId: string) => {
    setProjectsData((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, isPublic: !project.isPublic }
          : project
      )
    );
  };

  const handleDeleteProject = () => {
    if (deleteDialog.project) {
      setProjectsData((prev) =>
        prev.filter((p) => p.id !== deleteDialog.project.id)
      );
      setDeleteDialog({ open: false, project: null });
    }
  };

  const filteredProjects = projectsData
    .filter((project) => {
      const matchesSearch =
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || project.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "created") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      // Default: sort by modified
      return (
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    });

  return (
    <div className="space-y-6">
      <HeaderProfile onNewProject={() => setIsModalOpen(true)} />

      <FiltersAndSearch
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {filteredProjects.length > 0 ? (
        <ProjectsGrid
          projects={filteredProjects}
          getStatusColor={getStatusColor}
          onToggleVisibility={handleVisibilityToggle}
          onDeleteRequest={(project) =>
            setDeleteDialog({ open: true, project })
          }
        />
      ) : (
        <EmptyState
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onCreate={() => setIsModalOpen(true)}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, project: deleteDialog.project })
        }
        projectName={deleteDialog.project?.title || ""}
        onConfirm={handleDeleteProject}
      />

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
