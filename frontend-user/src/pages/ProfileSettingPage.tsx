import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "../ui/button";
import { PersonalInfoForm } from "../components/profile/PersonalInfoForm";
import { SecurityForm } from "../components/profile/SecurityForm";
import { NotificationsCard } from "../components/profile/NotificationsCard";
import { DangerZoneCard } from "../components/profile/DangerZoneCard";

export function ProfileSettingsPage() {
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    projectActivity: true,
    securityAlerts: true,
    weeklyDigest: false,
  });

  const [formData, setFormData] = useState({
    firstName: "Alex",
    lastName: "Chen",
    email: "alex.chen@example.com",
    bio: "Data scientist passionate about machine learning and AI applications.",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PersonalInfoForm
            formData={formData}
            onChange={(key, value) => handleInputChange(key, value)}
          />
          <SecurityForm
            data={{
              currentPassword: formData.currentPassword,
              newPassword: formData.newPassword,
              confirmPassword: formData.confirmPassword,
            }}
            onChange={(key, value) => handleInputChange(key, value)}
          />
        </div>

        <div className="space-y-6">
          <NotificationsCard
            notifications={notifications}
            onChange={(key, value) => handleNotificationChange(key, value)}
          />
          <DangerZoneCard />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
