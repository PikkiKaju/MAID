import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthResponse, AuthState} from '../../models/auth';
import { registerUser } from './registerThunks';
import { loginUser } from './loginThunks';

const initialState: AuthState = {
  token: null,
  displayName: null,
  isLoggedIn: false,
  status: 'inactive',
  error: null,
};

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

      localStorage.removeItem('token');
      localStorage.removeItem('displayName');
    },
    clearAuthStatus: (state) => {
        state.status = 'inactive';
        state.error = null;
    },
    // when we refresh our app we dont lose a session
    loginFromStorage: (state) => {
      const token = localStorage.getItem('token');
      
      if (token) {
        state.token = token;
        state.isLoggedIn = true;
        state.status = 'succeeded';
        state.error = null;
      }
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

        localStorage.setItem('token', action.payload.token);
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

        localStorage.setItem('token', action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = 'failed';  
        state.token = null;
        state.isLoggedIn = false;
        state.error = action.payload || 'Logowanie nie powiodło się.';
      });
  },
});

export const { login, logout, clearAuthStatus, loginFromStorage } = authSlice.actions;
export default authSlice.reducer;