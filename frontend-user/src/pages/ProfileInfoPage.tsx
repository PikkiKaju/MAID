import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ProfileOverview } from "../components/profile/ProfileOverview";
import { StatsGrid } from "../components/profile/StatsGrid";
import type { ProfileStats } from "../models/profile";
import { profileService } from "../api/profileService";
import { Loader2 } from "lucide-react";

export function ProfileInfoPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{
    avatar: string;
    name: string;
    surname: string;
    title: string;
    bio: string;
    email: string;
    joined: string;
    stats: ProfileStats;
  } | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await profileService.getProfile();
      const fullName =
        data.name && data.surname
          ? `${data.name} ${data.surname}`
          : data.name || data.surname || t("profile.user");

      const joinedDate = new Date(data.joined);
      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ];
      const monthIndex = joinedDate.getMonth();
      const monthKey = monthNames[monthIndex];
      const year = joinedDate.getFullYear();
      // Use direct access to translation resources
      const monthTranslationKey = `profile.months.${monthKey}`;
      const monthName = i18n.exists(monthTranslationKey)
        ? t(monthTranslationKey)
        : monthKey;
      const joinedText = t("profile.joined");
      const formattedJoined = `${joinedText} ${monthName} ${year}`;

      setProfileData({
        avatar: data.avatar,
        name: fullName,
        surname: data.surname,
        title: data.title || "",
        bio: data.bio || "",
        email: data.email || "",
        joined: formattedJoined,
        stats: {
          totalProjects: data.totalProjects,
          publicProjects: data.publicProjects,
          totalDatasets: data.totalDatasets,
          publicDatasets: data.totalPublicDatasets,
        },
      });
    } catch (err) {
      setError(t("profile.failedToLoadProfile"));
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile, i18n.language]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("profile.profileInformation")}
          </h1>
          <p className="text-muted-foreground">
            {t("profile.activityOverview")}
          </p>
        </div>
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("profile.profileInformation")}
        </h1>
        <p className="text-muted-foreground">{t("profile.activityOverview")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ProfileOverview
            avatarUrl={profileData.avatar}
            name={profileData.name}
            title={profileData.title}
            bio={profileData.bio}
            email={profileData.email}
            joined={profileData.joined}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <StatsGrid stats={profileData.stats} />
        </div>
      </div>
    </div>
  );
}
