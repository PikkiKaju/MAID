import { Database, FolderOpen, Home, Network, LucideIcon } from "lucide-react";

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  requiresAuth: boolean;
}

export const getNavigationItems = (
  t: (key: string) => string
): NavigationItem[] => [
  {
    id: "home",
    label: t("sidebar.home"),
    icon: Home,
    path: "/",
    requiresAuth: false,
  },
  {
    id: "projects",
    label: t("sidebar.myProjects"),
    icon: FolderOpen,
    path: "/projects",
    requiresAuth: true,
  },
  {
    id: "datasets",
    label: t("sidebar.datasets"),
    icon: Database,
    path: "/datasets-regresja",
    requiresAuth: true,
  },
  {
    id: "canvas",
    label: t("sidebar.canvas"),
    icon: Network,
    path: "/canvas",
    requiresAuth: true,
  },
];

