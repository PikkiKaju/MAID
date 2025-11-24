import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { HelpSearchBar } from "../components/profile/Help/SearchBar";
import { FAQList } from "../components/profile/Help/FAQList";
import {
  ContactTab,
  ResourcesTab,
} from "../components/profile/Help/ContactAndResources";
import { getFaqItems } from "../data/faqItems";
import { useTranslation } from "react-i18next";

export function ProfileHelpPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const faqItems = useMemo(() => getFaqItems(t), [t]);

  const filteredFAQ = useMemo(
    () =>
      faqItems.filter(
        (item) =>
          item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [faqItems, searchTerm]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("help.title")}</h1>
        <p className="text-muted-foreground">{t("help.subtitle")}</p>
      </div>

      <HelpSearchBar value={searchTerm} onChange={setSearchTerm} />

      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq">{t("help.faqstring")}</TabsTrigger>
          <TabsTrigger value="contact">{t("help.contact")}</TabsTrigger>
          <TabsTrigger value="resources">{t("help.resources")}</TabsTrigger>
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
