import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { formatDaysAgo, formatDateShort } from "../../utils/functions";
import type { ProjectGridItem } from "../../models/project";

interface Props {
  projects: ProjectGridItem[];
  getStatusColor: (status: string) => string;
  onToggleVisibility: (id: string, newVisibility: boolean) => void;
  onDeleteRequest: (project: ProjectGridItem) => void;
  onShareRequest: (project: ProjectGridItem) => void;
}

export default function ProjectsGrid({
  projects,
  getStatusColor,
  onToggleVisibility,
  onDeleteRequest,
  onShareRequest,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Local state to track visibility changes per project
  const [localVisibility, setLocalVisibility] = useState<
    Record<string, boolean>
  >({});
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  // Initialize local visibility state from projects
  useEffect(() => {
    const initialVisibility: Record<string, boolean> = {};
    projects.forEach((project) => {
      initialVisibility[project.id] = project.isPublic;
    });
    setLocalVisibility(initialVisibility);
  }, [projects]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`, { state: { from: "/projects" } });
  };

  const handleLocalVisibilityToggle = (projectId: string) => {
    setLocalVisibility((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const handleMenuOpenChange = (projectId: string, open: boolean) => {
    if (open) {
      setOpenMenus((prev) => new Set(prev).add(projectId));
    } else {
      // Menu is closing - save the change if visibility was modified
      const originalVisibility = projects.find(
        (p) => p.id === projectId
      )?.isPublic;
      const currentVisibility = localVisibility[projectId];

      if (
        originalVisibility !== undefined &&
        currentVisibility !== originalVisibility
      ) {
        onToggleVisibility(projectId, currentVisibility);
      }

      setOpenMenus((prev) => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
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
                {project.status === "Draft"
                  ? t("projects.draft")
                  : project.status === "Completed"
                  ? t("projects.completed")
                  : project.status === "Active"
                  ? t("projects.active")
                  : project.status}
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

            <DropdownMenu
              open={openMenus.has(project.id)}
              onOpenChange={(open) => handleMenuOpenChange(project.id, open)}
            >
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareRequest(project);
                  }}
                >
                  <Share className="h-4 w-4 mr-2" /> {t("projects.share")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div
                  className="px-2 py-1.5 text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {localVisibility[project.id] !== undefined ? (
                        localVisibility[project.id]
                      ) : project.isPublic ? (
                        <Globe className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}{" "}
                      {localVisibility[project.id] !== undefined
                        ? localVisibility[project.id]
                          ? t("projects.public")
                          : t("projects.private")
                        : project.isPublic
                        ? t("projects.public")
                        : t("projects.private")}
                    </span>
                    <Switch
                      checked={
                        localVisibility[project.id] !== undefined
                          ? localVisibility[project.id]
                          : project.isPublic
                      }
                      onCheckedChange={() => {
                        handleLocalVisibilityToggle(project.id);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {localVisibility[project.id] !== undefined
                      ? localVisibility[project.id]
                        ? t("projects.isPublic")
                        : t("projects.isPrivate")
                      : project.isPublic
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
                  {t("projects.createdAt")} {formatDateShort(project.createdAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
