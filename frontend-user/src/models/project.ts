import { RootState } from "../store/store";

export interface Project {
  id: string;
  userId: string;
  name: string;
  datasetId: string;
  createdAt: string;
  lastModifiedAt: string;
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
  yColumn: string;
  algorithm: string;
  parameters: Record<string, any>;
}

export interface ProjectMeta {
  id: string;
  userId: string;
  name: string;
  datasetId: string;
  createdAt: string;
  lastModifiedAt: string;
}