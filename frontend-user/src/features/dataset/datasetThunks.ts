import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosConfig";
import { Dataset, UserDataset, ThunkConfig } from "../../models/dataset";
import { datasetService } from "../../api/datasetService";

export const fetchPublicDatasets = createAsyncThunk<
  Dataset[],
  void,
  ThunkConfig
>("dataset/fetchPublic", async (_, { getState, rejectWithValue }) => {
  try {
    const { token } = getState().auth;

    const response = await axiosInstance.get<Dataset[]>("/Dataset/dataset-public", {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });
    return response.data;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || "Nie udało się pobrać publicznych zbiorów danych."
    );
  }
});

export const fetchUserDatasets = createAsyncThunk<
  UserDataset[],
  void,
  ThunkConfig
>("dataset/fetchUser", async (_, { getState, rejectWithValue }) => {
  try {
    const { token } = getState().auth;

    if (!token) {
      return rejectWithValue("Brak autoryzacji. Zaloguj się, aby zobaczyć swoje zbiory danych.");
    }

    const response = await axiosInstance.get<UserDataset[]>("/Dataset/list", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || "Nie udało się pobrać Twoich zbiorów danych."
    );
  }
});

export interface UploadCsvParams {
  file: File;
  name: string;
  columnTransform: string;
  emptyTransform: string;
  isPublic: boolean;
}

export interface UploadPhotoParams {
  file: File;
  name: string;
  isPublic: boolean;
}

export const uploadCsv = createAsyncThunk<
  { message: string; datasetId: string },
  UploadCsvParams,
  ThunkConfig
>("dataset/uploadCsv", async (params, { getState, rejectWithValue }) => {
  try {
    const { token } = getState().auth;

    if (!token) {
      return rejectWithValue("Brak autoryzacji. Zaloguj się, aby przesłać plik.");
    }

    const response = await datasetService.uploadCsv(
      params.file,
      params.name,
      params.columnTransform,
      params.emptyTransform,
      params.isPublic,
      token
    );

    return response;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || "Nie udało się przesłać pliku CSV."
    );
  }
});

export const uploadPhoto = createAsyncThunk<
  { message: string; datasetId: string },
  UploadPhotoParams,
  ThunkConfig
>("dataset/uploadPhoto", async (params, { getState, rejectWithValue }) => {
  try {
    const { token } = getState().auth;

    if (!token) {
      return rejectWithValue("Brak autoryzacji. Zaloguj się, aby przesłać plik.");
    }

    const response = await datasetService.uploadPhoto(
      params.file,
      params.name,
      params.isPublic,
      token
    );

    return response;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || "Nie udało się przesłać pliku ZIP."
    );
  }
});

