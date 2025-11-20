import { store } from '../store/store';
import { logout } from '../features/auth/authSlice';
import { isTokenValid, getTimeUntilExpiry } from './tokenManager';

/**
 * Sprawdza ważność tokenu i wylogowuje użytkownika, jeśli token wygasł
 * Powinno być wywoływane okresowo (np. co minutę) lub przy starcie aplikacji
 */
export const checkTokenExpiry = (): void => {
  if (!isTokenValid()) {
    // Token wygasł - wyloguj użytkownika
    store.dispatch(logout());
  }
};

/**
 * Uruchamia okresowe sprawdzanie ważności tokenu
 * @param intervalMs - Interwał sprawdzania w milisekundach (domyślnie 1 minuta)
 * @returns Funkcja do zatrzymania sprawdzania
 */
export const startTokenExpiryChecker = (intervalMs: number = 60 * 1000): (() => void) => {
  // Sprawdź od razu przy starcie
  checkTokenExpiry();

  // Uruchom okresowe sprawdzanie
  const intervalId = setInterval(() => {
    checkTokenExpiry();
  }, intervalMs);

  // Zwróć funkcję do zatrzymania
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Sprawdza, czy token wkrótce wygaśnie (np. w ciągu 5 minut)
 * Może być użyte do pokazania użytkownikowi ostrzeżenia
 * @param warningThresholdMs - Próg ostrzeżenia w milisekundach (domyślnie 5 minut)
 * @returns true, jeśli token wkrótce wygaśnie
 */
export const isTokenExpiringSoon = (warningThresholdMs: number = 5 * 60 * 1000): boolean => {
  const timeUntilExpiry = getTimeUntilExpiry();
  if (timeUntilExpiry === null) return false;
  return timeUntilExpiry <= warningThresholdMs;
};

