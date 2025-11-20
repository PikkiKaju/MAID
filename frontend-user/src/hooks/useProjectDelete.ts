import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import { fetchProjects } from "../features/project/projectThunks";
import { useToast } from "../components/toast/ToastProvider";
import type { ProjectDisplay } from "../models/project";

/**
 * Hook for handling project deletion
 */
export const useProjectDelete = () => {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const { showError } = useToast();

  const deleteProject = async (
    projectId: string,
    onSuccess?: () => void
  ): Promise<void> => {
    if (!token) {
      showError("Musisz być zalogowany, aby usunąć projekt.");
      return;
    }

    try {
      const axios = await import("../api/axiosConfig");
      await axios.default.delete(`/Project/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Refresh projects list
      try {
        await dispatch(fetchProjects());
      } catch {}

      onSuccess?.();
    } catch (err: any) {
      console.error("Error deleting project:", err);
      showError("Wystąpił błąd podczas usuwania projektu.");
      throw err;
    }
  };

  return { deleteProject };
};

