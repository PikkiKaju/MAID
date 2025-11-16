import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { ImageWithFallback } from "../image/ImageWithFallback";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../../ui/dropdown-menu";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import {
  Calendar,
  Globe,
  Lock,
  MoreVertical,
  Edit,
  Share,
  Trash2,
  User,
} from "lucide-react";

// Helper function to format date as "X days ago"
const formatDaysAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return "dzisiaj";
  } else if (diffInDays === 1) {
    return "1 dzień temu";
  } else if (diffInDays < 5) {
    return `${diffInDays} dni temu`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    if (weeks === 1) {
      return "1 tydzień temu";
    }
    return `${weeks} tygodni temu`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    if (months === 1) {
      return "1 miesiąc temu";
    }
    return `${months} miesięcy temu`;
  } else {
    const years = Math.floor(diffInDays / 365);
    if (years === 1) {
      return "1 rok temu";
    }
    return `${years} lat temu`;
  }
};

// Helper function to format date as "DD-MM-YYYY"
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  status: string;
  isPublic: boolean;
  category: string;
  lastModified: string;
  createdAt: string;
}

interface Props {
  projects: ProjectItem[];
  getStatusColor: (status: string) => string;
  onToggleVisibility: (id: string) => void;
  onDeleteRequest: (project: any) => void;
}

export default function ProjectsGrid({
  projects,
  getStatusColor,
  onToggleVisibility,
  onDeleteRequest,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
          onClick={() => handleProjectClick(project.id)}
        >
          <div className="relative">
            <ImageWithFallback
              src={project.imageUrl}
              alt={project.title}
              className="w-full h-32 object-cover"
            />
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
              <Badge
                variant="outline"
                className="bg-background/80 backdrop-blur-sm"
              >
                {project.isPublic ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" /> {t("projects.public")}
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" /> {t("projects.private")}
                  </>
                )}
              </Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 h-8 w-8 backdrop-blur-sm bg-card/80 hover:bg-card/90"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectClick(project.id);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" /> {t("projects.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Share className="h-4 w-4 mr-2" /> {t("projects.share")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div
                  className="px-2 py-1.5 text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {project.isPublic ? (
                        <Globe className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}{" "}
                      {project.isPublic
                        ? t("projects.public")
                        : t("projects.private")}
                    </span>
                    <Switch
                      checked={project.isPublic}
                      onCheckedChange={(checked) => {
                        onToggleVisibility(project.id);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.isPublic
                      ? t("projects.isPublic")
                      : t("projects.isPrivate")}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRequest(project);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> {t("projects.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardHeader className="pb-3">
            <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              {project.title}
            </h3>
            <Badge variant="outline" className="w-fit">
              {project.category}
            </Badge>
          </CardHeader>

          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
              {project.description}
            </p>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />{" "}
                <span>
                  {t("projects.lastModified")}{" "}
                  {formatDaysAgo(project.lastModified)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />{" "}
                <span>
                  {t("projects.createdAt")} {formatDate(project.createdAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
