import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthResponse, AuthState} from '../../models/auth';
import { registerUser } from './registerThunks';
import { loginUser } from './loginThunks';
import { capitalizeFirstLetter } from '../../utilis/functions';
import { saveToken, getToken, getDisplayName, clearToken, isTokenValid, getExpiryFromJWT } from '../../utilis/tokenManager';

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

      clearToken();
    },
    clearAuthStatus: (state) => {
        state.status = 'inactive';
        state.error = null;
    },
    // when we refresh our app we dont lose a session
    // Sprawdza ważność tokenu i przywraca sesję, jeśli token jest ważny
    loginFromStorage: (state) => {
      const token = getToken(); // getToken automatycznie sprawdza ważność i usuwa wygasły token
      const displayName = getDisplayName();
      
      if (token && isTokenValid()) {
        state.token = token;
        state.displayName = capitalizeFirstLetter(displayName || '');
        state.isLoggedIn = true;
        state.status = 'succeeded';
        state.error = null;
      } else {
        // Token nie istnieje lub wygasł
        state.token = null;
        state.displayName = null;
        state.isLoggedIn = false;
        state.status = 'inactive';
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

        // Zapisz token z automatycznym wykryciem czasu wygaśnięcia z JWT
        const jwtExpiry = getExpiryFromJWT(action.payload.token);
        if (jwtExpiry) {
          // Użyj czasu wygaśnięcia z JWT
          const expiryMs = jwtExpiry - Date.now();
          saveToken(action.payload.token, action.payload.username, expiryMs > 0 ? expiryMs : undefined);
        } else {
          // Użyj domyślnego czasu wygaśnięcia
          saveToken(action.payload.token, action.payload.username);
        }
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

        // Zapisz token z automatycznym wykryciem czasu wygaśnięcia z JWT
        const jwtExpiry = getExpiryFromJWT(action.payload.token);
        if (jwtExpiry) {
          // Użyj czasu wygaśnięcia z JWT
          const expiryMs = jwtExpiry - Date.now();
          saveToken(action.payload.token, action.payload.username, expiryMs > 0 ? expiryMs : undefined);
        } else {
          // Użyj domyślnego czasu wygaśnięcia
          saveToken(action.payload.token, action.payload.username);
        }
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