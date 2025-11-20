import type { ProfileSettingsFormData } from "../models/profile";
import { validateEmail } from "./functions";
import type { ProfileData } from "../api/profileService";

/**
 * Profile data from API (using ProfileData from profileService)
 */
type ProfileApiData = Pick<
  ProfileData,
  "name" | "surname" | "email" | "title" | "bio"
>;

/**
 * Maps profile data from API to ProfileSettingsFormData
 * @param data - Profile data from API
 * @returns ProfileSettingsFormData with empty password fields
 */
export const mapProfileToFormData = (
  data: ProfileApiData
): ProfileSettingsFormData => {
  return {
    firstName: data.name || "",
    lastName: data.surname || "",
    email: data.email || "",
    title: data.title || "",
    bio: data.bio || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
};

/**
 * Validation result for profile settings
 */
export interface ProfileValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates profile settings form data
 * @param formData - Form data to validate
 * @param t - Translation function
 * @returns Validation result with error message if invalid
 */
export const validateProfileSettings = (
  formData: ProfileSettingsFormData,
  t: (key: string) => string
): ProfileValidationResult => {
  // Validate email
  const emailValidationError = validateEmail(formData.email);
  if (emailValidationError) {
    return { isValid: false, error: t("profile.invalidEmail") };
  }

  // Validate passwords if any password field is filled
  if (formData.newPassword || formData.confirmPassword) {
    if (formData.newPassword !== formData.confirmPassword) {
      return { isValid: false, error: t("profile.passwordsDoNotMatch") };
    }
    if (!formData.currentPassword) {
      return { isValid: false, error: t("profile.currentPasswordRequired") };
    }
  }

  return { isValid: true, error: null };
};

/**
 * Clears password fields from form data
 * @param formData - Form data to clear passwords from
 * @returns Form data with empty password fields
 */
export const clearPasswordFields = (
  formData: ProfileSettingsFormData
): ProfileSettingsFormData => {
  return {
    ...formData,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
};

