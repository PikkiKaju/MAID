import { useState } from "react";
import { Book, MessageCircle, Phone, Video } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { HelpSearchBar } from "../components/profile/Help/SearchBar";
import { QuickActions } from "../components/profile/Help/QuickActions";
import { FAQList } from "../components/profile/Help/FAQList";
import {
  ContactTab,
  ResourcesTab,
} from "../components/profile/Help/ContactAndResources";
import type { FAQItem, QuickAction } from "../models/profile";

export function ProfileHelpPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const faqItems: FAQItem[] = [
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

  const quickActions: QuickAction[] = [
    {
      title: "Documentation",
      description: "Complete guides and API reference",
      icon: Book,
      href: "#",
      color: "blue",
    },
    {
      title: "Video Tutorials",
      description: "Step-by-step video walkthroughs",
      icon: Video,
      href: "#",
      color: "purple",
    },
    {
      title: "Community Forum",
      description: "Connect with other users",
      icon: MessageCircle,
      href: "#",
      color: "green",
    },
    {
      title: "Contact Support",
      description: "Get help from our team",
      icon: Phone,
      href: "#",
      color: "orange",
    },
  ];

  const filteredFAQ = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Help & Support</h1>
        <p className="text-muted-foreground">
          Find answers, get help, and learn more about Maid
        </p>
      </div>

      <HelpSearchBar value={searchTerm} onChange={setSearchTerm} />

      <QuickActions items={quickActions} />

      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact Us</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-4">
          <FAQList items={filteredFAQ} />
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <ContactTab />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <ResourcesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
