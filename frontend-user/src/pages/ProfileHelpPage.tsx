import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { HelpSearchBar } from "../components/profile/Help/SearchBar";
import { FAQList } from "../components/profile/Help/FAQList";
import {
  ContactTab,
  ResourcesTab,
} from "../components/profile/Help/ContactAndResources";
import { faqItems } from "../data/faqItems";

export function ProfileHelpPage() {
  const [searchTerm, setSearchTerm] = useState("");

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
