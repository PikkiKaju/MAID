import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PersonalInfoForm } from "../components/profile/PersonalInfoForm";
import { SecurityForm } from "../components/profile/SecurityForm";
import { DangerZoneCard } from "../components/profile/DangerZoneCard";
import { ProfileSettingsHeader } from "../components/profile/Setting/ProfileSettingsHeader";
import { ProfileSettingsActions } from "../components/profile/Setting/ProfileSettingsActions";
import { ProfileSettingsLoading } from "../components/profile/Setting/ProfileSettingsLoading";
import { profileService } from "../api/profileService";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../store/store";
import { logout } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/toast/ToastProvider";
import type { ProfileSettingsFormData, AvatarState } from "../models/profile";
import {
  mapProfileToFormData,
  validateProfileSettings,
  clearPasswordFields,
} from "../utilis/profileHelpers";

export function ProfileSettingsPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileSettingsFormData>({
    firstName: "",
    lastName: "",
    email: "",
    title: "",
    bio: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [avatarState, setAvatarState] = useState<AvatarState>({
    selectedAvatarId: null,
    selectedAvatarSvg: null,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await profileService.getProfile();
      setFormData(mapProfileToFormData(data));
    } catch (err) {
      showError(t("profile.failedToLoadProfile"));
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarSelect = (avatarId: string, avatarSvg: string) => {
    setAvatarState({
      selectedAvatarId: avatarId,
      selectedAvatarSvg: avatarSvg,
    });
  };

  const handleCancel = () => {
    loadProfile();
    setAvatarState({ selectedAvatarId: null, selectedAvatarSvg: null });
  };

  const handleSave = async () => {
    setSaving(true);

    // Validate form data
    const validation = validateProfileSettings(formData, t);
    if (!validation.isValid) {
      showError(validation.error || t("profile.failedToUpdateProfile"));
      setSaving(false);
      return;
    }

    try {
      await profileService.updateProfile({
        name: formData.firstName,
        surname: formData.lastName,
        title: formData.title,
        bio: formData.bio,
        email: formData.email,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      // Save avatar to database only if it was selected
      if (avatarState.selectedAvatarId) {
        await profileService.updateAvatar(avatarState.selectedAvatarId);
        // Send event to update avatar in header
        window.dispatchEvent(new CustomEvent("avatarUpdated"));
        // Clear selected avatar state after saving
        setAvatarState({ selectedAvatarId: null, selectedAvatarSvg: null });
      }

      // Clear password fields after successful save
      setFormData((prev) => clearPasswordFields(prev));

      // Show success toast
      showSuccess(t("profile.profileUpdatedSuccess"));
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || t("profile.failedToUpdateProfile");
      showError(errorMessage);
      console.error("Error updating profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t("profile.deleteAccountConfirm"))) {
      return;
    }

    try {
      await profileService.deleteProfile();
      dispatch(logout());
      navigate("/login");
    } catch (err) {
      showError(t("profile.failedToDeleteAccount"));
      console.error("Error deleting account:", err);
    }
  };

  if (loading) {
    return <ProfileSettingsLoading />;
  }

  return (
    <div className="space-y-6">
      <ProfileSettingsHeader />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PersonalInfoForm
            formData={formData}
            onChange={(key, value) => handleInputChange(key, value)}
            onAvatarSelect={handleAvatarSelect}
            selectedAvatarId={avatarState.selectedAvatarId}
            selectedAvatarSvg={avatarState.selectedAvatarSvg}
          />
        </div>

        <div className="space-y-6">
          <DangerZoneCard onDelete={handleDeleteAccount} />
          <SecurityForm
            data={{
              currentPassword: formData.currentPassword,
              newPassword: formData.newPassword,
              confirmPassword: formData.confirmPassword,
            }}
            onChange={(key, value) => handleInputChange(key, value)}
          />
        </div>
      </div>

      <ProfileSettingsActions
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    </div>
  );
}
