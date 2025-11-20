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
import ShareProjectDialog from "../components/projects/ShareProjectDialog";
import type { DeleteDialogState, ProjectFilters } from "../models/project";
import { projectService } from "../api/projectService";
import { useToast } from "../components/toast/ToastProvider";
import { useTranslation } from "react-i18next";
import {
  mapProjectToDisplay,
  filterAndSortProjects,
  validateProjectForm,
  calculatePagination,
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
  const token = useSelector((state: RootState) => state.auth.token);
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();

  const [filters, setFilters] = useState<ProjectFilters>({
    searchTerm: "",
    statusFilter: "all",
    sortBy: "modified",
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    project: null,
  });
  const [shareDialog, setShareDialog] = useState<{
    open: boolean;
    project: { id: string; title: string } | null;
  }>({
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

  useEffect(() => {
    // Only fetch projects when token is available to avoid unauthorized requests
    if (token) {
      dispatch(fetchProjects());
    }
  }, [dispatch, token]);

  const handleConfirm = async () => {
    if (!validateProjectForm(projectName, projectDescription)) {
      return;
    }

    try {
      const result = await dispatch(
        createProject({ name: projectName, description: projectDescription })
      ).unwrap();
      // Reset form
      setProjectName("");
      setProjectDescription("");
      setIsModalOpen(false);
      navigate(`/projects/${result.id}`, { state: { from: "/projects" } });
    } catch (err) {
      console.error("Błąd tworzenia projektu:", err);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    // Reset form when closing
    setProjectName("");
    setProjectDescription("");
  };

  const handleVisibilityToggle = async (
    projectId: string,
    newVisibility: boolean
  ) => {
    if (!token) {
      showError(
        t("projects.loginRequired") ||
          "Musisz być zalogowany, aby zmienić widoczność projektu."
      );
      return;
    }

    try {
      await projectService.updateProjectVisibility(
        projectId,
        newVisibility,
        token
      );
      showSuccess(
        newVisibility
          ? t("projects.visibilityChangedToPublic") ||
              "Projekt został ustawiony jako publiczny."
          : t("projects.visibilityChangedToPrivate") ||
              "Projekt został ustawiony jako prywatny."
      );
      // Refresh projects list
      dispatch(fetchProjects());
    } catch (err: any) {
      console.error("Error updating project visibility:", err);
      showError(
        t("projects.visibilityUpdateError") ||
          "Błąd podczas zmiany widoczności projektu."
      );
    }
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
  const { totalPages, paginatedItems: paginatedProjects } = useMemo(
    () => calculatePagination(filteredProjects, currentPage, itemsPerPage),
    [filteredProjects, currentPage, itemsPerPage]
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
            onShareRequest={(project) =>
              setShareDialog({
                open: true,
                project: { id: project.id, title: project.title },
              })
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

      <ShareProjectDialog
        open={shareDialog.open}
        onOpenChange={(open) =>
          setShareDialog({ open, project: shareDialog.project })
        }
        projectId={shareDialog.project?.id || ""}
        projectName={shareDialog.project?.title || ""}
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
