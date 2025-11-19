import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Pagination } from "../ui/pagination";
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
import type { DeleteDialogState, ProjectFilters } from "../models/project";
import {
  mapProjectToDisplay,
  filterAndSortProjects,
} from "../utilis/projectHelpers";
import { getProjectStatusColor } from "../utilis/functions";
import { useProjectDelete } from "../hooks/useProjectDelete";

function ProjectsPage() {
  const { projects, status } = useSelector((state: RootState) => state.project);
  const isLoading = status === "loading";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { deleteProject } = useProjectDelete();

  const [filters, setFilters] = useState<ProjectFilters>({
    searchTerm: "",
    statusFilter: "all",
    sortBy: "modified",
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    project: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Map projects to display format
  const projectsData = useMemo(
    () => projects.map(mapProjectToDisplay),
    [projects]
  );

  const token = useSelector((state: RootState) => state.auth.token);

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
    if (projectName.length >= 4 && projectDescription.length >= 10) {
      try {
        const result = await dispatch(
          createProject({ name: projectName, description: projectDescription })
        ).unwrap();
        // Reset form
        setProjectName("");
        setProjectDescription("");
        setIsModalOpen(false);
        navigate(`/projects/${result.id}`);
      } catch (err) {
        console.error("Błąd tworzenia projektu:", err);
      }
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    // Reset form when closing
    setProjectName("");
    setProjectDescription("");
  };

  const handleVisibilityToggle = (_projectId: string) => {
    // This is a local UI update - actual visibility change should be handled via API
    // For now, we'll just update the local state for immediate feedback
    // TODO: Implement actual API call to update project visibility
  };

  const handleDeleteProject = async () => {
    if (!deleteDialog.project) return;
    const id = deleteDialog.project.id;
    if (!id) return;

    try {
      await deleteProject(id, () => {
        setDeleteDialog({ open: false, project: null });
      });
    } catch (err) {
      // Error is already handled in useProjectDelete hook
      setDeleteDialog({ open: false, project: null });
    }
  };

  // Filter and sort projects
  const filteredProjects = useMemo(
    () =>
      filterAndSortProjects(
        projectsData,
        filters.searchTerm,
        filters.statusFilter,
        filters.sortBy
      ),
    [projectsData, filters.searchTerm, filters.statusFilter, filters.sortBy]
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = useMemo(
    () => filteredProjects.slice(startIndex, endIndex),
    [filteredProjects, startIndex, endIndex]
  );

  // Reset to page 1 when filtered projects change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredProjects.length, currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <HeaderProfile onNewProject={() => setIsModalOpen(true)} />

      <FiltersAndSearch
        searchTerm={filters.searchTerm}
        setSearchTerm={(value) =>
          setFilters((prev) => ({ ...prev, searchTerm: value }))
        }
        statusFilter={filters.statusFilter}
        setStatusFilter={(value) =>
          setFilters((prev) => ({ ...prev, statusFilter: value }))
        }
        sortBy={filters.sortBy}
        setSortBy={(value) =>
          setFilters((prev) => ({
            ...prev,
            sortBy: value as "name" | "created" | "modified",
          }))
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProjects.length > 0 ? (
        <>
          <ProjectsGrid
            projects={paginatedProjects}
            getStatusColor={getProjectStatusColor}
            onToggleVisibility={handleVisibilityToggle}
            onDeleteRequest={(project) =>
              setDeleteDialog({ open: true, project })
            }
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredProjects.length}
          />
        </>
      ) : (
        <EmptyState
          searchTerm={filters.searchTerm}
          statusFilter={filters.statusFilter}
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
        projectDescription={projectDescription}
        onNameChange={setProjectName}
        onDescriptionChange={setProjectDescription}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default ProjectsPage;
