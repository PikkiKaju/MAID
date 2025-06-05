import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import { AuthResponse, AuthState, LoginPayload, RegisterPayload } from '../../models/auth';
import axiosInstance from '../../api/axiosConfig';

const initialState: AuthState = {
  token: null,
  displayName: null,
  isLoggedIn: false,
  status: 'inactive',
  error: null,
};

// ====================================================================
//                      Async Thunk For Register
// ====================================================================
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
          errorMessage = 'Brak odpowiedzi serwera.';
        } else {
          errorMessage = axiosError.message;
        }
      }
      return rejectWithValue(errorMessage);
    }
  }
);

// ====================================================================
//                        Async Thunk For Login
// ====================================================================
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
      return { token: response.data.token, displayName: credentials.username };
    } catch (err) {
      let errorMessage = 'Wystąpił nieznany błąd.';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        if (axiosError.response) {
          errorMessage = (axiosError.response.data as { message: string | undefined })?.message || 'Błąd serwera.';
        } else if (axiosError.request) {
          errorMessage = 'Brak odpowiedzi serwera.';
        } else {
          errorMessage = axiosError.message;
        }
      }
      return rejectWithValue(errorMessage);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ token: string }>) => {
      state.token = action.payload.token;
      state.isLoggedIn = true;
      state.status = 'succeeded';
      state.error = null;
    },
    logout: (state) => {
      state.token = null;
      state.isLoggedIn = false;
      state.status = 'inactive';
      state.error = null;
    },
    clearAuthStatus: (state) => {
        state.status = 'inactive';
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.isLoggedIn = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = 'failed';
        state.token = null;
        state.isLoggedIn = false;
        state.error = action.payload || 'Rejestracja nie powiodła się.';
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.isLoggedIn = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = 'failed';  
        state.token = null;
        state.isLoggedIn = false;
        state.error = action.payload || 'Logowanie nie powiodło się.';
      });
  },
});

export const { login, logout, clearAuthStatus } = authSlice.actions;
export default authSlice.reducer;