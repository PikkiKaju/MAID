import { RootState } from "../store/store";

export interface Project {
  id: string;
  userId: string; 
  name: string;
  datasetId: string; 
  createdAt: string; 
  lastModifiedAt: string; 
  isPublic: boolean;
  likes: number;
  status?: number; // 0 = draft, 1 = completed, 2 = active
  pictureUrl?: string; // URL to project image
  description?: string; // Project description
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface CreateProjectResponse {
  id: string;
}

export interface ThunkConfig {
  state: RootState;
  rejectValue: string;
}

export interface ProjectDetail {
  id: string;
  xColumn: string;
  x2Column?: string;
  yColumn: string;
  algorithm: string;
  parameters: Record<string, any>;
  isPublic: boolean;
  status?: number; // 0 = draft, 1 = completed, 2 = active
}

export interface ProjectMeta {
  id: string;
  userId: string;
  name: string;
  datasetId: string;
  createdAt: string;
  lastModifiedAt: string;
  isPublic: boolean;
  status?: number; // 0 = draft, 1 = completed, 2 = active
}

export interface ApiProject {
    id: string;
    userId: string;
    name: string;
    datasetId: string;
    createdAt: string;
    lastModifiedAt: string;
    isPublic: boolean;
    likes: number;
    pictureUrl?: string; // URL to project image
    description?: string;
    ownerName?: string;
    ownerAvatar?: string;
    isLiked?: boolean;
}

export interface DisplayProject {
    id: string;
    name: string;   
    createdAt: string; 
    lastModifiedAt: string;
    isPublic: boolean;
    likes: number;
    pictureUrl?: string; // URL to project image
    description?: string;
    ownerName?: string;
    ownerAvatar?: string;
    isLiked?: boolean;
}

export interface ProjectDisplay extends Omit<Project, 'status'> {
  title: string;
  description: string;
  status: string; // Display status as string (Draft, Running, Active)
  category: string;
  lastModified: string;
  imageUrl: string;
}

export interface DeleteDialogState {
  open: boolean;
  project: ProjectDisplay | null;
}

export interface ProjectFilters {
  searchTerm: string;
  statusFilter: string;
  sortBy: "name" | "created" | "modified";
}