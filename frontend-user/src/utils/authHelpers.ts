/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates login form fields
 * @param username - Username to validate
 * @param password - Password to validate
 * @param t - Translation function
 * @returns Validation result with error message if invalid
 */
export const validateLoginForm = (
  username: string,
  password: string,
  t: (key: string) => string
): ValidationResult => {
  if (!username.trim()) {
    return { isValid: false, error: t("auth.usernameRequired") };
  }
  if (!password.trim()) {
    return { isValid: false, error: t("auth.passwordRequired") };
  }
  if (username.trim().length < 3) {
    return { isValid: false, error: t("auth.usernameMinLength") };
  }
  if (password.length < 4) {
    return { isValid: false, error: t("auth.passwordMinLength") };
  }
  return { isValid: true, error: null };
};

/**
 * Validates register form fields
 * @param username - Username to validate
 * @param email - Email to validate
 * @param password - Password to validate
 * @param confirmPassword - Confirm password to validate
 * @param t - Translation function
 * @param validateEmailFn - Email validation function (optional, uses default if not provided)
 * @returns Validation result with error message if invalid
 */
export const validateRegisterForm = (
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
  t: (key: string) => string,
  validateEmailFn?: (email: string) => string | null
): ValidationResult => {
  // Validate username
  if (!username.trim()) {
    return { isValid: false, error: t("auth.usernameRequired") };
  }
  if (username.trim().length < 3) {
    return { isValid: false, error: t("auth.usernameMinLength") };
  }

  // Validate email
  if (!email.trim()) {
    return { isValid: false, error: t("auth.emailRequired") };
  }
  if (validateEmailFn) {
    const emailError = validateEmailFn(email);
    if (emailError) {
      return { isValid: false, error: emailError };
    }
  }

  // Validate password
  if (!password.trim()) {
    return { isValid: false, error: t("auth.passwordRequired") };
  }
  if (password.length < 4) {
    return { isValid: false, error: t("auth.passwordMinLength") };
  }

  // Validate confirm password
  if (!confirmPassword.trim()) {
    return { isValid: false, error: t("auth.confirmPasswordRequired") };
  }
  if (password !== confirmPassword) {
    return { isValid: false, error: t("auth.passwordMismatch") };
  }

  return { isValid: true, error: null };
};

/**
 * Validates password match
 * @param password - Password
 * @param confirmPassword - Confirm password
 * @param t - Translation function
 * @returns Error message if passwords don't match, null otherwise
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string,
  t: (key: string) => string
): string | null => {
  if (password !== confirmPassword) {
    return t("auth.passwordMismatch");
  }
  return null;
};

