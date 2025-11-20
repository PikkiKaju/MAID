import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosConfig";
import { CreateProjectInput, CreateProjectResponse, Project, ThunkConfig } from "../../models/project";
import { projectService } from "../../api/projectService";

export const createProject = createAsyncThunk<
  CreateProjectResponse,
  CreateProjectInput,
  ThunkConfig
>("project/create", async ({ name, description }, { getState, rejectWithValue }) => {
  try {
    const { token } = getState().auth;

    const response = await axiosInstance.post(
      "/Project",
      { name, description },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (err: any) {
    return rejectWithValue("Nie udało się utworzyć projektu.");
  }
});

export const fetchProjects = createAsyncThunk<
  Project[],
  void,
  ThunkConfig
>("project/fetchAll", async (_, { getState, rejectWithValue }) => {
  try {
    const { token } = getState().auth;

    const response = await axiosInstance.get("/Project/My", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err: any) {
    return rejectWithValue("Nie udało się pobrać projektów.");
  }
});

export const likeProject = createAsyncThunk<
  void,
  { projectId: string; userId: string },
  ThunkConfig
>("project/like", async ({ projectId, userId }, { getState, rejectWithValue }) => {
  try {
    const { token } = getState().auth;
    if (!token) {
      return rejectWithValue("Musisz być zalogowany, aby polubić projekt.");
    }

    await projectService.likeProject(projectId, userId, token);
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || "Nie udało się polubić projektu."
    );
  }
});