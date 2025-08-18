import { createAsyncThunk } from "@reduxjs/toolkit";
import { AuthResponse, LoginPayload } from "../../models/auth";
import axiosInstance from "../../api/axiosConfig";
import axios, { AxiosError } from "axios";

export const loginUser = createAsyncThunk<
  AuthResponse,
  LoginPayload,
  { rejectValue: string }
>(
  'auth/loginUser',
  async (credentials: LoginPayload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<AuthResponse>(
        '/Auth/login',
        credentials
      );
      return response.data; 
    } catch (err) {
      let errorMessage = 'Wystąpił nieznany błąd.';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        if (axiosError.response) {
          errorMessage = (axiosError.response.data as { message: string | undefined })?.message || 'Błąd serwera.';
        } else if (axiosError.request) {
          errorMessage = 'Brak odpowiedzi od serwera.';
        } else {
          errorMessage = axiosError.message;
        }
      }
      return rejectWithValue(errorMessage);
    }
  }
);
