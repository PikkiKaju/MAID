/**
 * Token Manager - zarządza tokenem autoryzacji z obsługą wygaśnięcia
 * 
 * Token jest przechowywany w localStorage, aby przetrwał zamknięcie przeglądarki.
 * Domyślny czas wygaśnięcia: 2 godziny (można zmienić)
 */

const TOKEN_KEY = 'token';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const DISPLAY_NAME_KEY = 'displayName';

// Domyślny czas wygaśnięcia tokenu: 2 godziny (w milisekundach)
const DEFAULT_TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 godziny

/**
 * Zapisuje token wraz z timestamp wygaśnięcia
 * @param token - Token JWT
 * @param displayName - Nazwa użytkownika
 * @param expiryMs - Czas wygaśnięcia w milisekundach (opcjonalny, domyślnie 2 godziny)
 */
export const saveToken = (token: string, displayName: string, expiryMs: number = DEFAULT_TOKEN_EXPIRY_MS): void => {
  const expiryTime = Date.now() + expiryMs;
  
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  localStorage.setItem(DISPLAY_NAME_KEY, displayName);
};

/**
 * Pobiera token z localStorage
 * @returns Token lub null, jeśli nie istnieje lub wygasł
 */
export const getToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  // Jeśli nie ma tokenu lub timestamp wygaśnięcia
  if (!token || !expiryTime) {
    return null;
  }
  
  // Sprawdź, czy token wygasł
  const now = Date.now();
  const expiry = parseInt(expiryTime, 10);
  
  if (now >= expiry) {
    // Token wygasł - usuń go
    clearToken();
    return null;
  }
  
  return token;
};

/**
 * Pobiera nazwę użytkownika z localStorage
 */
export const getDisplayName = (): string | null => {
  return localStorage.getItem(DISPLAY_NAME_KEY);
};

/**
 * Sprawdza, czy token jest ważny (istnieje i nie wygasł)
 */
export const isTokenValid = (): boolean => {
  const token = getToken();
  return token !== null;
};

/**
 * Pobiera czas wygaśnięcia tokenu
 */
export const getTokenExpiry = (): number | null => {
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiryTime ? parseInt(expiryTime, 10) : null;
};

/**
 * Sprawdza, ile czasu pozostało do wygaśnięcia tokenu (w milisekundach)
 */
export const getTimeUntilExpiry = (): number | null => {
  const expiry = getTokenExpiry();
  if (!expiry) return null;
  
  const now = Date.now();
  const remaining = expiry - now;
  return remaining > 0 ? remaining : 0;
};

/**
 * Usuwa token i związane dane z localStorage
 */
export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
  
  // Usuń też z sessionStorage dla kompatybilności wstecznej
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(DISPLAY_NAME_KEY);
};

/**
 * Próbuje dekodować JWT token, aby uzyskać informacje o wygaśnięciu
 * Jeśli token zawiera 'exp', używa go zamiast domyślnego czasu
 * @param token - Token JWT
 * @returns Timestamp wygaśnięcia w milisekundach lub null
 */
export const getExpiryFromJWT = (token: string): number | null => {
  try {
    // JWT składa się z 3 części oddzielonych kropkami: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Dekoduj payload (base64)
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    
    // 'exp' to timestamp w sekundach (Unix timestamp)
    if (decoded.exp) {
      // Konwertuj na milisekundy
      return decoded.exp * 1000;
    }
    
    return null;
  } catch (error) {
    console.error('Błąd dekodowania JWT:', error);
    return null;
  }
};

/**
 * Dekoduje JWT token, aby uzyskać user ID z claimów
 * @param token - Token JWT
 * @returns User ID (NameIdentifier) lub null
 */
export const getUserIdFromToken = (token: string): string | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    
    // ClaimTypes.NameIdentifier w .NET odpowiada 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
    // lub może być zapisany jako 'nameid' lub 'sub'
    return decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] 
      || decoded.nameid 
      || decoded.sub 
      || null;
  } catch (error) {
    console.error('Błąd dekodowania JWT:', error);
    return null;
  }
};

