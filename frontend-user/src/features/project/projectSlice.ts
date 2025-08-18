import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Project } from "../../models/project";
import { fetchProjects } from "./projectThunks";

interface ProjectState {
  projects: Project[];
  status: "inactive" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  status: 'inactive',
  error: null,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProjects.fulfilled, (state, action: PayloadAction<Project[]>) => {
        state.status = "succeeded";
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Błąd pobierania projektów.";
      })
  },
});

export default projectSlice.reducer;