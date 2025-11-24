import { createAsyncThunk } from "@reduxjs/toolkit";
import { AuthResponse, LoginPayload } from "../../models/auth";
import axiosInstance from "../../api/axiosConfig";
import axios, { AxiosError } from "axios";

/**
 * Extracts the blocked date from error message
 * Format: "User is blocked until 2025-11-25 19:07:05Z"
 */
const extractBlockedDate = (message: string): string | null => {
  const match = message.match(/blocked until (.+)/i);
  if (match && match[1]) {
    try {
      const blockedDate = new Date(match[1]);
      if (!isNaN(blockedDate.getTime())) {
        return blockedDate.toISOString();
      }
    } catch (e) {
      console.error("Error parsing blocked date:", e);
    }
  }
  return null;
};

/**
 * Checks if error message indicates user is blocked
 */
const isBlockedUserError = (message: string): boolean => {
  return /User is blocked until/i.test(message);
};

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
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        if (axiosError.response) {
          const status = axiosError.response.status;
          
          // Handle different response data formats (string or object)
          let errorText = '';
          if (typeof axiosError.response.data === 'string') {
            errorText = axiosError.response.data;
          } else {
            const responseData = axiosError.response.data as { message?: string; error?: string };
            errorText = responseData?.message || responseData?.error || '';
          }
          
          // Check if user is blocked - return special format with date
          if (isBlockedUserError(errorText)) {
            const blockedDate = extractBlockedDate(errorText);
            if (blockedDate) {
              // Return special format that LoginPage will recognize and format with translations
              return rejectWithValue(`BLOCKED:${blockedDate}`);
            }
          }
          
          // Handle different error statuses
          if (status === 401 || status === 403) {
            // Only show invalid credentials if user is not blocked
            return rejectWithValue('INVALID_CREDENTIALS');
          } else if (status === 404) {
            return rejectWithValue('Użytkownik nie został znaleziony.');
          } else if (status === 400) {
            return rejectWithValue(errorText || 'Nieprawidłowe dane logowania.');
          } else if (status >= 500) {
            return rejectWithValue('Błąd serwera. Spróbuj ponownie później.');
          } else {
            return rejectWithValue(errorText || 'Błąd logowania.');
          }
        } else if (axiosError.request) {
          return rejectWithValue('Brak odpowiedzi od serwera. Sprawdź połączenie z internetem.');
        } else {
          return rejectWithValue(axiosError.message || 'Wystąpił błąd podczas logowania.');
        }
      }
      return rejectWithValue('Wystąpił nieznany błąd.');
    }
  }
);
