import type { FAQItem } from "../models/profile";

export const faqItems: FAQItem[] = [
  {
    question: "How do I create a new project?",
    answer:
      "Click the 'New Project' button in the My Projects section and follow the setup wizard.",
    category: "Projects",
  },
  {
    question: "What file formats are supported for datasets?",
    answer:
      "We support CSV, JSON, Excel, Parquet, and compressed files (ZIP, TAR, GZ).",
    category: "Datasets",
  },
  {
    question: "How can I make my project public?",
    answer:
      "In your project settings, toggle the visibility switch from Private to Public.",
    category: "Projects",
  },
  {
    question: "How do I delete my account?",
    answer: "Go to Profile Settings and scroll to the Danger Zone section.",
    category: "Account",
  },
  {
    question: "Can I collaborate with other users?",
    answer:
      "Yes, you can share projects and collaborate in real-time with team members.",
    category: "Collaboration",
  },
  {
    question: "What are the storage limits?",
    answer:
      "Free accounts get 5GB storage. Pro accounts get 100GB with unlimited projects.",
    category: "Account",
  },
];

