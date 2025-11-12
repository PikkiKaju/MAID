import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { PersonalInfoForm } from "../components/profile/PersonalInfoForm";
import { SecurityForm } from "../components/profile/SecurityForm";
import { DangerZoneCard } from "../components/profile/DangerZoneCard";
import { profileService } from "../api/profileService";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../store/store";
import { logout } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";

export function ProfileSettingsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
      setError("Failed to load profile data. Please try again.");
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Walidacja haseł
    if (formData.newPassword || formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError("New passwords do not match.");
        setSaving(false);
        return;
      }
      if (!formData.currentPassword) {
        setError("Current password is required to change password.");
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

      // Można dodać toast notification tutaj
      alert("Profile updated successfully!");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to update profile. Please try again."
      );
      console.error("Error updating profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await profileService.deleteProfile();
      dispatch(logout());
      navigate("/login");
    } catch (err) {
      setError("Failed to delete account. Please try again.");
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
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}

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
          Cancel
        </Button>
        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
