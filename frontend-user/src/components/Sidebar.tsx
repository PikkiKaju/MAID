import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { cn } from "../utils/tailwind";
import Logo from "./Logo";
import { getNavigationItems } from "../data/navigationItems";

function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

  const allNavigationItems = getNavigationItems(t);

  // Filter navigation items based on login status
  const navigationItems = allNavigationItems.filter(
    (item) => !item.requiresAuth || isLoggedIn
  );

  return (
    <Sidebar className="border-none">
      <SidebarHeader className="shadow-md px-6 py-4">
        <Logo />
      </SidebarHeader>

      <SidebarContent className="px-4 py-6 light:bg-gray-200 dark:bg-sidebar-accent/30">
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
