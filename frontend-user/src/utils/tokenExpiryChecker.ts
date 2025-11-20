import { store } from '../store/store';
import { logout } from '../features/auth/authSlice';
import { isTokenValid, getTimeUntilExpiry } from './tokenManager';

/**
 * Checks token validity and logs out user if token has expired
 * Should be called periodically (e.g. every minute) or at startup
 */
export const checkTokenExpiry = (): void => {
  if (!isTokenValid()) {
    // Token expired - log out user
    store.dispatch(logout());
  }
};

/**
 * Starts periodic token validity check
 * @param intervalMs - Check interval in milliseconds (default 1 minute)
 * @returns Function to stop the check
 */
export const startTokenExpiryChecker = (intervalMs: number = 60 * 1000): (() => void) => {
  // Check immediately at startup
  checkTokenExpiry();

  // Start periodic check
  const intervalId = setInterval(() => {
    checkTokenExpiry();
  }, intervalMs);

  // Return function to stop the check
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Checks if token is expiring soon (e.g. within 5 minutes)
 * Can be used to show a warning to the user
 * @param warningThresholdMs - Warning threshold in milliseconds (default 5 minutes)
 * @returns true if token is expiring soon
 */
export const isTokenExpiringSoon = (warningThresholdMs: number = 5 * 60 * 1000): boolean => {
  const timeUntilExpiry = getTimeUntilExpiry();
  if (timeUntilExpiry === null) return false;
  return timeUntilExpiry <= warningThresholdMs;
};

