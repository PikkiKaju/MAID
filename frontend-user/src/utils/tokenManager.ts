/**
 * Token Manager - manages authorization token with expiration handling
 * 
 * Token is stored in localStorage to survive browser close.
 * Default expiration time: 2 hours (can be changed)
 */

const TOKEN_KEY = 'token';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const DISPLAY_NAME_KEY = 'displayName';

// Default token expiration time: 2 hours (in milliseconds)
const DEFAULT_TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 godziny

/**
 * Saves token with expiration timestamp
 * @param token - Token JWT
 * @param displayName - Username
 * @param expiryMs - Expiration time in milliseconds (optional, default 2 hours)
 */
export const saveToken = (token: string, displayName: string, expiryMs: number = DEFAULT_TOKEN_EXPIRY_MS): void => {
  const expiryTime = Date.now() + expiryMs;
  
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  localStorage.setItem(DISPLAY_NAME_KEY, displayName);
};

/**
 * Gets token from localStorage
 * @returns Token or null if it doesn't exist or has expired
 */
export const getToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  // If there is no token or expiration timestamp
  if (!token || !expiryTime) {
    return null;
  }
  
  // Check if token has expired
  const now = Date.now();
  const expiry = parseInt(expiryTime, 10);
  
  if (now >= expiry) {
    // Token expired - delete it
    clearToken();
    return null;
  }
  
  return token;
};

/**
 * Gets username from localStorage
 */
export const getDisplayName = (): string | null => {
  return localStorage.getItem(DISPLAY_NAME_KEY);
};

/**
  * Checks if token is valid (exists and has not expired)
 */
export const isTokenValid = (): boolean => {
  const token = getToken();
  return token !== null;
};

/**
 * Gets token expiration time
 */
export const getTokenExpiry = (): number | null => {
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiryTime ? parseInt(expiryTime, 10) : null;
};

/**
 * Checks how much time is left until token expiration (in milliseconds)
 */
export const getTimeUntilExpiry = (): number | null => {
  const expiry = getTokenExpiry();
  if (!expiry) return null;
  
  const now = Date.now();
  const remaining = expiry - now;
  return remaining > 0 ? remaining : 0;
};

/**
 * Deletes token and related data from localStorage
 */
export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
  
  // Delete from sessionStorage for backward compatibility
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(DISPLAY_NAME_KEY);
};

/**
 * Tries to decode JWT token to get expiration information
 * If token contains 'exp', uses it instead of default time
 * @param token - Token JWT
 * @returns Timestamp expiration in milliseconds or null
 */
export const getExpiryFromJWT = (token: string): number | null => {
  try {
    // JWT consists of 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode payload (base64)
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    
    // 'exp' to timestamp in seconds (Unix timestamp)
    if (decoded.exp) {
      // Convert to milliseconds
      return decoded.exp * 1000;
    }
    
    return null;
  } catch (error) {
    console.error('Błąd dekodowania JWT:', error);
    return null;
  }
};

/**
 * Decodes JWT token to get user ID from claims
 * @param token - Token JWT
 * @returns User ID (NameIdentifier) or null
 */
export const getUserIdFromToken = (token: string): string | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    
    // ClaimTypes.NameIdentifier in .NET corresponds to 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
    // or it can be written as 'nameid' or 'sub'
    return decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] 
      || decoded.nameid 
      || decoded.sub 
      || null;
  } catch (error) {
    console.error('Błąd dekodowania JWT:', error);
    return null;
  }
};

