import { createAsyncThunk } from "@reduxjs/toolkit";
import { AuthResponse, RegisterPayload } from "../../models/auth";
import axiosInstance from "../../api/axiosConfig";
import axios, { AxiosError } from "axios";

export const registerUser = createAsyncThunk<
  AuthResponse, // Output Type if it was success
  RegisterPayload, // Input type argument
  { rejectValue: string } // Output Type if it was fail
>(
  'auth/registerUser',
  async (userData: RegisterPayload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<AuthResponse>(
        '/Auth/register',
        userData
      );
      return response.data;
    } catch (err) {
      let errorMessage = 'Wystąpił nieznany błąd.';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        if (axiosError.response) {
          errorMessage = (axiosError.response.data as { message: string }).message || 'Błąd serwera.';
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