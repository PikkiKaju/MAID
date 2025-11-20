import type { Project, ProjectDisplay, DisplayProject } from "../models/project";
import { getStatusString } from "./functions";
import { calculatePagination } from "./datasetHelpers";
import type {
  DatasetMetadata,
  DatasetMyMetadata,
} from "../api/datasetService";

const DEFAULT_PROJECT_IMAGE =
  "https://images.unsplash.com/photo-1653564142048-d5af2cf9b50f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwc2NpZW5jZSUyMG1hY2hpbmUlMjBsZWFybmluZ3xlbnwxfHx8fDE3NTk3NjYyMDR8MA&ixlib=rb-4.1.0&q=80&w=1080";

/**
 * Maps a Project to ProjectDisplay with additional display properties
 * @param project - Project to map
 * @returns ProjectDisplay with all display properties
 */
export const mapProjectToDisplay = (project: Project): ProjectDisplay => {
  return {
    ...project,
    title: project.name,
    description: project.description || "",
    status: getStatusString(project.status),
    category: undefined,
    lastModified: project.lastModifiedAt,
    imageUrl: project.pictureUrl || DEFAULT_PROJECT_IMAGE, // Use pictureUrl from API, fallback to default
  };
};

/**
 * Filters and sorts projects based on search term, status filter, and sort option
 * @param projects - Array of projects to filter and sort
 * @param searchTerm - Search term to filter by
 * @param statusFilter - Status filter ("all" or specific status)
 * @param sortBy - Sort option ("name", "created", or "modified")
 * @returns Filtered and sorted array of projects
 */
export const filterAndSortProjects = (
  projects: ProjectDisplay[],
  searchTerm: string,
  statusFilter: string,
  sortBy: "name" | "created" | "modified"
): ProjectDisplay[] => {
  return projects
    .filter((project) => {
      const matchesSearch =
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        project.status.toLowerCase() === statusFilter.toLowerCase();
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
};

/**
 * Transforms DisplayProject to Project format used by home page components
 * @param project - DisplayProject to transform
 * @returns Project with additional properties (isLiked, ownerAvatar)
 */
export const transformProject = (
  project: DisplayProject
): {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  imageUrl: string;
  ownerAvatar?: string;
  isLiked?: boolean;
} => {
  return {
    id: project.id,
    title: project.name,
    description: project.description || "",
    author: project.ownerName || "Unknown",
    // Use lastModifiedAt as createdAt since API doesn't return createdAt
    createdAt: project.lastModifiedAt || project.createdAt || "",
    imageUrl:
      project.pictureUrl ||
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
    ownerAvatar: project.ownerAvatar,
    isLiked: project.isLiked,
  };
};

/**
 * Validates project creation form
 * @param projectName - Project name to validate
 * @param projectDescription - Project description to validate
 * @returns True if form is valid, false otherwise
 */
export const validateProjectForm = (
  projectName: string,
  projectDescription: string
): boolean => {
  return projectName.length >= 4 && projectDescription.length >= 10;
};

/**
 * Calculates pagination for projects (re-export from datasetHelpers for consistency)
 */
export { calculatePagination };

/**
 * Combines public and user datasets into a single array
 * @param publicDatasets - Public datasets from API
 * @param userDatasets - User datasets from API (DatasetMyMetadata)
 * @returns Combined array of datasets with username set to empty string for user datasets
 */
export const combineDatasets = (
  publicDatasets: DatasetMetadata[],
  userDatasets: DatasetMyMetadata[]
): DatasetMetadata[] => {
  return [
    ...publicDatasets,
    ...userDatasets.map((ds) => ({
      id: ds.id,
      name: ds.name,
      username: "",
      createdAt: ds.createdAt,
    })),
  ];
};

/**
 * Checks if dataset ID is valid (not empty GUID)
 * @param datasetId - Dataset ID to validate
 * @returns True if dataset ID is valid, false otherwise
 */
export const isValidDatasetId = (datasetId: string): boolean => {
  return datasetId !== "00000000-0000-0000-0000-000000000000" && datasetId !== "";
};
