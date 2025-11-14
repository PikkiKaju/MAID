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
          const status = axiosError.response.status;
          const responseData = axiosError.response.data as { message?: string; error?: string };
          
          // Handle different error statuses
          if (status === 401 || status === 403) {
            errorMessage = 'Niepoprawna nazwa użytkownika lub hasło.';
          } else if (status === 404) {
            errorMessage = 'Użytkownik nie został znaleziony.';
          } else if (status === 400) {
            errorMessage = responseData?.message || responseData?.error || 'Nieprawidłowe dane logowania.';
          } else if (status >= 500) {
            errorMessage = 'Błąd serwera. Spróbuj ponownie później.';
          } else {
            errorMessage = responseData?.message || responseData?.error || 'Błąd logowania.';
          }
        } else if (axiosError.request) {
          errorMessage = 'Brak odpowiedzi od serwera. Sprawdź połączenie z internetem.';
        } else {
          errorMessage = axiosError.message || 'Wystąpił błąd podczas logowania.';
        }
      }
      return rejectWithValue(errorMessage);
    }
  }
);
