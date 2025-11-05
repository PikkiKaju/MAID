import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Dataset, UserDataset } from "../../models/dataset";
import { fetchPublicDatasets, fetchUserDatasets, uploadCsv, uploadPhoto } from "./datasetThunks.ts";

interface DatasetState {
  publicDatasets: Dataset[];
  userDatasets: UserDataset[];
  publicStatus: "inactive" | "loading" | "succeeded" | "failed";
  userStatus: "inactive" | "loading" | "succeeded" | "failed";
  uploadStatus: "inactive" | "loading" | "succeeded" | "failed";
  publicError: string | null;
  userError: string | null;
  uploadError: string | null;
}

const initialState: DatasetState = {
  publicDatasets: [],
  userDatasets: [],
  publicStatus: 'inactive',
  userStatus: 'inactive',
  uploadStatus: 'inactive',
  publicError: null,
  userError: null,
  uploadError: null,
};

const datasetSlice = createSlice({
  name: "dataset",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Public datasets
      .addCase(fetchPublicDatasets.pending, (state) => {
        state.publicStatus = "loading";
        state.publicError = null;
      })
      .addCase(fetchPublicDatasets.fulfilled, (state, action: PayloadAction<Dataset[]>) => {
        state.publicStatus = "succeeded";
        state.publicDatasets = action.payload;
        state.publicError = null;
      })
      .addCase(fetchPublicDatasets.rejected, (state, action) => {
        state.publicStatus = "failed";
        state.publicError = action.payload || "Błąd pobierania publicznych zbiorów danych.";
      })
      // User datasets
      .addCase(fetchUserDatasets.pending, (state) => {
        state.userStatus = "loading";
        state.userError = null;
      })
      .addCase(fetchUserDatasets.fulfilled, (state, action: PayloadAction<UserDataset[]>) => {
        state.userStatus = "succeeded";
        state.userDatasets = action.payload;
        state.userError = null;
      })
      .addCase(fetchUserDatasets.rejected, (state, action) => {
        state.userStatus = "failed";
        state.userError = action.payload || "Błąd pobierania Twoich zbiorów danych.";
      })
      // Upload CSV
      .addCase(uploadCsv.pending, (state) => {
        state.uploadStatus = "loading";
        state.uploadError = null;
      })
      .addCase(uploadCsv.fulfilled, (state) => {
        state.uploadStatus = "succeeded";
        state.uploadError = null;
      })
      .addCase(uploadCsv.rejected, (state, action) => {
        state.uploadStatus = "failed";
        state.uploadError = action.payload || "Błąd przesyłania pliku CSV.";
      })
      // Upload Photo
      .addCase(uploadPhoto.pending, (state) => {
        state.uploadStatus = "loading";
        state.uploadError = null;
      })
      .addCase(uploadPhoto.fulfilled, (state) => {
        state.uploadStatus = "succeeded";
        state.uploadError = null;
      })
      .addCase(uploadPhoto.rejected, (state, action) => {
        state.uploadStatus = "failed";
        state.uploadError = action.payload || "Błąd przesyłania pliku ZIP.";
      });
  },
});

export default datasetSlice.reducer;

