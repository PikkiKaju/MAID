import { RootState } from "../store/store";

// Model odpowiadający odpowiedzi z API /Dataset/dataset-public
export interface ApiDataset {
  id: string;
  name: string;
  dataType: number;
  userId: string;
  isPublic: boolean;
  username: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

// Model do przechowywania w Redux store (public datasets)
export interface Dataset {
  id: string;
  name: string;
  dataType: number;
  userId: string;
  isPublic: boolean;
  username: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

// Model odpowiadający odpowiedzi z API /Dataset/list (user datasets)
export interface ApiUserDataset {
  id: string;
  name: string;
  username: string;
  dataType: number;
  createdAt: string;
  isPublic: boolean;
  likes: number;
}

// Model do przechowywania w Redux store (user datasets)
export interface UserDataset {
  id: string;
  name: string;
  username: string;
  dataType: number;
  createdAt: string;
  isPublic: boolean;
  likes: number;
}

export interface ThunkConfig {
  state: RootState;
  rejectValue: string;
}

// Re-export helper functions from dataset.tsx
export { getFileIcon, getStatusColor } from "./dataset.tsx";

