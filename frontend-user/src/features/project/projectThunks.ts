import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosConfig";
import { CreateProjectInput, CreateProjectResponse, Project, ThunkConfig } from "../../models/project";

export const createProject = createAsyncThunk<
  CreateProjectResponse,
  CreateProjectInput,
  ThunkConfig
>("project/create", async ({ name }, { getState, rejectWithValue }) => {
  try {
    const { token } = getState().auth;

    const response = await axiosInstance.post(
      "/Project",
      { name },
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