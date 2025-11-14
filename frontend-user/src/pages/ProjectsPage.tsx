import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CreateProjectWindow from "../components/projects/CreateProjectWindow";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import {
  createProject,
  fetchProjects,
} from "../features/project/projectThunks";
import HeaderProfile from "../components/projects/HeaderProfile";
import FiltersAndSearch from "../components/projects/FiltersAndSearch";
import ProjectsGrid from "../components/projects/ProjectsGrid";
import EmptyState from "../components/projects/EmptyState";
import DeleteConfirmationDialog from "../components/projects/DeleteConfirmationDialog";

function ProjectsPage() {
  const { projects } = useSelector((state: RootState) => state.project);

  {
    /* ----------- TYMCZASOWY TWÓR PROJEKTOWY ---------------- */
  }

  type TabTemp = {
    id: string;
    userId: string;
    name: string;
    datasetId: string;
    createdAt: string;
    lastModifiedAt: string;
    isPublic: boolean;
    likes: number;
    title: string;
    description: string;
    status: string;
    lastModified: string;
    category: string;
    imageUrl: string;
  };

  const projectsMixed: TabTemp[] = projects.map((originalProject) => {
    return {
      ...originalProject,
      title: originalProject.name,
      description: "Opis domyślny",
      status: "Active",
      category: "ML",
      lastModified: originalProject.lastModifiedAt,
      imageUrl:
        "https://images.unsplash.com/photo-1653564142048-d5af2cf9b50f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwc2NpZW5jZSUyMG1hY2hpbmUlMjBsZWFybmluZ3xlbnwxfHx8fDE3NTk3NjYyMDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    } as TabTemp;
  });
  {
    /* ------------------------------------------------------ */
  }

  // const isLoggedIn = useSelector((state: any) => state.auth.isLoggedIn);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("modified");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    project: any;
  }>({ open: false, project: null });
  const [projectsData, setProjectsData] = useState(projectsMixed);

  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    {
      /* ----------- TYMCZASOWY TWÓR PROJEKTOWY ---------------- */
    }

    const mapped: TabTemp[] = projects.map(
      (originalProject) =>
        ({
          ...originalProject,
          title: originalProject.name,
          description: "Opis domyślny",
          status: "Active",
          category: "ML",
          lastModified: originalProject.lastModifiedAt,
          imageUrl:
            "https://images.unsplash.com/photo-1653564142048-d5af2cf9b50f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwc2NpZW5jZSUyMG1hY2hpbmUlMjBsZWFybmluZ3xlbnwxfHx8fDE3NTk3NjYyMDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
        } as TabTemp)
    );
    setProjectsData(mapped);
  }, [projects]);

  {
    /* ------------------------------------------------------ */
  }

  useEffect(() => {
    // Only fetch projects when token is available to avoid unauthorized requests
    if (token) {
      dispatch(fetchProjects());
    }
  }, [dispatch, token]);

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

  {
    /* ----------- TYMCZASOWY TWÓR PROJEKTOWY ---------------- */
  }

  const handleDeleteProject = () => {
    if (!deleteDialog.project) return;
    const id = deleteDialog.project.id;
    if (!id) return;

    // require token for API call
    if (!token) {
      alert("Musisz być zalogowany, aby usunąć projekt.");
      setDeleteDialog({ open: false, project: null });
      return;
    }

    (async () => {
      try {
        // call backend delete endpoint
        const axios = await import("../api/axiosConfig");
        await axios.default.delete(`/Project/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // remove locally for immediate feedback
        setProjectsData((prev) => prev.filter((p) => p.id !== id));

        // also refresh redux list in background
        try {
          await dispatch(fetchProjects() as any);
        } catch {}

        setDeleteDialog({ open: false, project: null });
      } catch (err: any) {
        console.error("Error deleting project:", err);
        alert("Wystąpił błąd podczas usuwania projektu.");
        setDeleteDialog({ open: false, project: null });
      }
    })();
  };

  {
    /* ------------------------------------------------------ */
  }

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
