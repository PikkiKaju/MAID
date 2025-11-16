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
}

export interface CreateProjectInput {
  name: string;
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
}

export interface ProjectMeta {
  id: string;
  userId: string;
  name: string;
  datasetId: string;
  createdAt: string;
  lastModifiedAt: string;
  isPublic: boolean;
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
}

export interface DisplayProject {
    id: string;
    name: string;   
    createdAt: string; 
    lastModifiedAt: string;
    isPublic: boolean;
    likes: number;
}

export interface ProjectDisplay extends Project {
  title: string;
  description: string;
  status: string;
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