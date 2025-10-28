import type { LucideIcon } from "lucide-react";

export type Activity = {
  type: "project" | "dataset";
  title: string;
  date: string;
};

export type Skill = { name: string; level: number };

export type Achievement = {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
};

export type ProfileStats = {
  totalProjects: number;
  publicProjects: number;
  totalDatasets: number;
  followers: number;
  following: number;
  contributions: number;
};

export type PersonalInfo = {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
};

export type SecurityData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type Notifications = {
  emailUpdates: boolean;
  projectActivity: boolean;
  securityAlerts: boolean;
  weeklyDigest: boolean;
};

export type FAQItem = {
  question: string;
  answer: string;
  category: string;
};

export type QuickAction = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: "blue" | "purple" | "green" | "orange";
};


