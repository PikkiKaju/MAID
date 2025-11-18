import type { Project, ProjectDisplay } from "../models/project";
import { getStatusString } from "./functions";

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
    description: "Opis domyślny",
    status: getStatusString(project.status),
    category: "ML",
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

