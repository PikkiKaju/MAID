import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { PersonalInfoForm } from "../components/profile/PersonalInfoForm";
import { SecurityForm } from "../components/profile/SecurityForm";
import { DangerZoneCard } from "../components/profile/DangerZoneCard";
import { profileService } from "../api/profileService";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../store/store";
import { logout } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/toast/ToastProvider";

export function ProfileSettingsPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    title: "",
    bio: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedAvatarSvg, setSelectedAvatarSvg] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await profileService.getProfile();
      setFormData({
        firstName: data.name || "",
        lastName: data.surname || "",
        email: data.email || "",
        title: data.title || "",
        bio: data.bio || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
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
    setSelectedAvatarId(avatarId);
    setSelectedAvatarSvg(avatarSvg);
  };

  // Funkcja walidacji emaila
  const validateEmail = (email: string): string | null => {
    if (!email) {
      return null; // Pusty email jest OK (opcjonalne pole)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return t("profile.invalidEmail");
    }

    return null;
  };

  const handleSave = async () => {
    setSaving(true);

    // Walidacja emaila
    const emailValidationError = validateEmail(formData.email);
    if (emailValidationError) {
      showError(emailValidationError);
      setSaving(false);
      return;
    }

    // Walidacja haseł
    if (formData.newPassword || formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        showError(t("profile.passwordsDoNotMatch"));
        setSaving(false);
        return;
      }
      if (!formData.currentPassword) {
        showError(t("profile.currentPasswordRequired"));
        setSaving(false);
        return;
      }
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

      // Zapisuj avatar do bazy danych tylko jeśli został wybrany
      if (selectedAvatarId) {
        await profileService.updateAvatar(selectedAvatarId);
        // Wyślij event, aby zaktualizować avatar w headerze
        window.dispatchEvent(new CustomEvent("avatarUpdated"));
        // Wyczyść stan wybranego avatara po zapisaniu
        setSelectedAvatarId(null);
        setSelectedAvatarSvg(null);
      }

      // Wyczyść pola haseł po udanym zapisie
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      // Pokaż toast sukcesu
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
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("profile.profileSettings")}
        </h1>
        <p className="text-muted-foreground">{t("profile.manageSettings")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PersonalInfoForm
            formData={formData}
            onChange={(key, value) => handleInputChange(key, value)}
            onAvatarSelect={handleAvatarSelect}
            selectedAvatarId={selectedAvatarId}
            selectedAvatarSvg={selectedAvatarSvg}
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

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            loadProfile();
            setSelectedAvatarId(null);
            setSelectedAvatarSvg(null);
          }}
        >
          {t("common.cancel")}
        </Button>
        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("profile.saving")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t("profile.saveChanges")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
