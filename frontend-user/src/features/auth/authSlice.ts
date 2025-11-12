import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthResponse, AuthState} from '../../models/auth';
import { registerUser } from './registerThunks';
import { loginUser } from './loginThunks';
import { capitalizeFirstLetter } from '../../utilis/functions';

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
    login: (state, action: PayloadAction<{ token: string, displayName: string }>) => {
      state.token = action.payload.token;
      state.displayName = capitalizeFirstLetter(action.payload.displayName);
      state.isLoggedIn = true;
      state.status = 'succeeded';
      state.error = null;
    },
    logout: (state) => {
      state.token = null;
      state.displayName = null;
      state.isLoggedIn = false;
      state.status = 'inactive';
      state.error = null;

      sessionStorage.removeItem('token');
      sessionStorage.removeItem('displayName');
      // Also remove from localStorage for backward compatibility
      localStorage.removeItem('token');
      localStorage.removeItem('displayName');
    },
    clearAuthStatus: (state) => {
        state.status = 'inactive';
        state.error = null;
    },
    // when we refresh our app we dont lose a session (only for current tab)
    loginFromStorage: (state) => {
      // Try sessionStorage first (current session)
      let token = sessionStorage.getItem('token');
      let displayName = sessionStorage.getItem('displayName');
      
      // Fallback to localStorage for backward compatibility
      if (!token) {
        token = localStorage.getItem('token');
        displayName = localStorage.getItem('displayName');
        // Migrate to sessionStorage if found in localStorage
        if (token) {
          sessionStorage.setItem('token', token);
          if (displayName) {
            sessionStorage.setItem('displayName', displayName);
          }
        }
      }
      
      if (token) {
        state.token = token;
        state.displayName = capitalizeFirstLetter(displayName || '');
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
        state.displayName = capitalizeFirstLetter(action.payload.username);
        state.isLoggedIn = true;
        state.error = null;

        sessionStorage.setItem('token', action.payload.token);
        sessionStorage.setItem('displayName', action.payload.username); 
      })
      .addCase(registerUser.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = 'failed';
        state.token = null;
        state.displayName = null;
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
        state.displayName = capitalizeFirstLetter(action.payload.username);
        state.isLoggedIn = true;
        state.error = null;

        sessionStorage.setItem('token', action.payload.token);
        sessionStorage.setItem('displayName', action.payload.username);
      })
      .addCase(loginUser.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = 'failed';  
        state.token = null;
        state.displayName = null;
        state.isLoggedIn = false;
        state.error = action.payload || 'Logowanie nie powiodło się.';
      });
  },
});

export const { login, logout, clearAuthStatus, loginFromStorage } = authSlice.actions;
export default authSlice.reducer;