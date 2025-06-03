// Auth global state
export interface AuthState {
  token: string | null;
  displayName: string | null;
  isLoggedIn: boolean;
  status: 'inactive' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Interface with values to send backend for register
export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

// Interface with values to send backend for login
export interface LoginPayload {
  username: string;
  password: string;
}

// Auth response from server with token
export interface AuthResponse {
  token: string;
}

// Fields needed to create user account
export interface RegisterUserForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}