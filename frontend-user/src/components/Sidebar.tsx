import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { cn } from "../utilis/tailwind";
import { Database, FolderOpen, Home, Sparkles, Network } from "lucide-react";

function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { id: "home", label: t("sidebar.home"), icon: Home, path: "/" },
    {
      id: "projects",
      label: t("sidebar.myProjects"),
      icon: FolderOpen,
      path: "/projects",
    },
    {
      id: "datasets",
      label: t("sidebar.datasets"),
      icon: Database,
      path: "/datasets-regresja",
    },
    {
      id: "canvas",
      label: t("sidebar.canvas"),
      icon: Network,
      path: "/canvas",
    },
  ];

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Maid
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarMenu>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  onClick={() => navigate(item.path)}
                  isActive={isActive}
                  className={cn(
                    "w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
