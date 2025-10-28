import { Star, Users, Trophy, Github } from "lucide-react";
import { ProfileOverview } from "../components/profile/ProfileOverview";
import { StatsGrid } from "../components/profile/StatsGrid";
import { SkillsList } from "../components/profile/SkillsList";
import { RecentActivity } from "../components/profile/RecentActivity";
import { AchievementsGrid } from "../components/profile/AchievementsGrid";
import type {
  Activity,
  Achievement,
  Skill,
  ProfileStats,
} from "../models/profile";

export function ProfileInfoPage() {
  const profileStats: ProfileStats = {
    totalProjects: 12,
    publicProjects: 8,
    totalDatasets: 24,
    followers: 128,
    following: 45,
    contributions: 156,
  };

  const recentActivity: Activity[] = [
    {
      type: "project",
      title: "Updated Customer Sentiment Analysis",
      date: "2 hours ago",
    },
    { type: "dataset", title: "Added sales_data_2024.xlsx", date: "1 day ago" },
    {
      type: "project",
      title: "Created Medical Image Classification",
      date: "3 days ago",
    },
    {
      type: "dataset",
      title: "Uploaded product_images.zip",
      date: "5 days ago",
    },
    {
      type: "project",
      title: "Shared Real Estate Price Prediction",
      date: "1 week ago",
    },
  ];

  const skills: Skill[] = [
    { name: "Machine Learning", level: 90 },
    { name: "Python", level: 95 },
    { name: "Data Visualization", level: 85 },
    { name: "Deep Learning", level: 80 },
    { name: "SQL", level: 88 },
    { name: "Statistics", level: 92 },
  ];

  const achievements: Achievement[] = [
    {
      title: "Early Adopter",
      description: "Joined in the first month",
      icon: Trophy,
      color: "text-yellow-600",
    },
    {
      title: "Data Expert",
      description: "Completed 10+ projects",
      icon: Star,
      color: "text-blue-600",
    },
    {
      title: "Community Builder",
      description: "Helped 50+ users",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Open Source",
      description: "5 public projects",
      icon: Github,
      color: "text-purple-600",
    },
  ];

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
            avatarUrl="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face"
            name="Alex Chen"
            title="Data Scientist"
            bio="Data scientist passionate about machine learning and AI applications. Building innovative solutions for real-world problems."
            location="San Francisco, CA"
            joined="Joined October 2024"
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <StatsGrid stats={profileStats} />
          <SkillsList skills={skills} />
          <RecentActivity activity={recentActivity} />
        </div>
      </div>

      <AchievementsGrid achievements={achievements} />
    </div>
  );
}
