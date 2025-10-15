import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "../ui/sidebar";

import { Sparkles, Home, FolderOpen, Database } from "lucide-react";
import Header from "../components/Header";
import { cn } from "../utilis/tailwind";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    {
      id: "projects",
      label: "My Projects",
      icon: FolderOpen,
      path: "/projects",
    },
    {
      id: "datasets",
      label: "Datasets",
      icon: Database,
      path: "/datasets-regresja",
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        {/* Sidebar */}
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 overflow-auto bg-gray-100">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
