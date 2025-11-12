import { useEffect, useState } from "react";
import { ProfileOverview } from "../components/profile/ProfileOverview";
import { StatsGrid } from "../components/profile/StatsGrid";
import type { ProfileStats } from "../models/profile";
import { profileService } from "../api/profileService";
import { Loader2 } from "lucide-react";

export function ProfileInfoPage() {
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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await profileService.getProfile();
      const fullName =
        data.name && data.surname
          ? `${data.name} ${data.surname}`
          : data.name || data.surname || "User";

      const joinedDate = new Date(data.joined);
      const formattedJoined = `Joined ${joinedDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })}`;

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
      setError("Failed to load profile data. Please try again.");
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-semibold">Profile Information</h1>
          <p className="text-muted-foreground">
            Your activity and contributions overview
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
        <h1 className="text-2xl font-semibold">Profile Information</h1>
        <p className="text-muted-foreground">
          Your activity and contributions overview
        </p>
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
