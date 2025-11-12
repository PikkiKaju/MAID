export type Activity = {
  type: "project" | "dataset";
  title: string;
  date: string;
};

export type ProfileStats = {
  totalProjects: number;
  publicProjects: number;
  totalDatasets: number;
  publicDatasets: number;
};

export type PersonalInfo = {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  title?: string;
};

export type ProfileData = {
  avatar: string;
  name: string;
  surname: string;
  title: string;
  bio: string;
  joined: string;
  totalProjects: number;
  publicProjects: number;
  totalDatasets: number;
  totalPublicDatasets: number;
};

export type SecurityData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type FAQItem = {
  question: string;
  answer: string;
  category: string;
};


