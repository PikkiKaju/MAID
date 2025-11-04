import { useTranslation } from "react-i18next";
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
// formatDate not used here

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
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
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" /> {t("projects.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="h-4 w-4 mr-2" /> {t("projects.share")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm">
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
                      onCheckedChange={() => onToggleVisibility(project.id)}
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
                  onClick={() => onDeleteRequest(project)}
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
                  {t("projects.lastModified")} {project.lastModified}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />{" "}
                <span>
                  {t("projects.createdAt")} {project.createdAt}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
