import axiosInstance from "./axiosConfig";
import { ProjectDetail, ProjectMeta } from "../models/project";

export interface CalculationResult {
  prediction: number[];
  svg_plot: string;
  model_info?: any;
  degree?: number;
  n_features?: number;
  coefficients?: number[];
  intercept?: number;
}

export const projectService = {
  getProject: async (id: string, token: string) => {
    const response = await axiosInstance.get(`/Project/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  updateProjectDetails: async (
    id: string,
    detail: ProjectDetail,
    datasetId: string,
    token: string
  ) => {
    await axiosInstance.put(
      `/Project/${id}/details`,
      { ...detail, datasetId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  updateProjectDataset: async (
    id: string,
    datasetId: string,
    token: string
  ) => {
    await axiosInstance.put(
      `/Project/${id}/dataset`,
      JSON.stringify(datasetId),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  },

  deleteProject: async (id: string, token: string) => {
    await axiosInstance.delete(`/Project/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  startCalculation: async (
    id: string,
    token: string
  ): Promise<CalculationResult> => {
    const response = await axiosInstance.post(
      `/Calculation/start`,
      JSON.stringify(id),
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },
};

