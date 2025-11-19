import { useTranslation } from "react-i18next";
import { Filter } from "lucide-react";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import CategoryGrid from "./CategoryGrid";

export interface Project {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  category: string;
  imageUrl: string;
  ownerAvatar?: string;
  isLiked?: boolean;
}

export interface ProjectListProps {
  projects: Project[];
  favorites: Set<string>;
  handleFavoriteToggle: (projectId: string) => void;
}

export const CategorySection: React.FC<ProjectListProps> = ({
  projects,
  favorites,
  handleFavoriteToggle,
}) => {
  const { t } = useTranslation();

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{t("home.categories")}</h2>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          {t("projects.filter")}
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="ml">ML</TabsTrigger>
          <TabsTrigger value="dl">Deep Learning</TabsTrigger>
          <TabsTrigger value="cv">Computer Vision</TabsTrigger>
          <TabsTrigger value="nlp">NLP</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <CategoryGrid
            projects={projects}
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />
        </TabsContent>

        <TabsContent value="ml" className="mt-6">
          <CategoryGrid
            projects={projects.filter((p) => p.category === "ML")}
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />
        </TabsContent>

        <TabsContent value="dl" className="mt-6">
          <CategoryGrid
            projects={projects.filter((p) => p.category === "Deep Learning")}
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />
        </TabsContent>

        <TabsContent value="cv" className="mt-6">
          <CategoryGrid
            projects={projects.filter((p) => p.category === "Computer Vision")}
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />
        </TabsContent>

        <TabsContent value="nlp" className="mt-6">
          <CategoryGrid
            projects={projects.filter((p) => p.category === "NLP")}
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <CategoryGrid
            projects={projects.filter((p) => p.category === "Analytics")}
            favorites={favorites}
            handleFavoriteToggle={handleFavoriteToggle}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default CategorySection;
