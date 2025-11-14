import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "../ui/sidebar";

import Header from "../components/Header";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import AppSidebar from "../components/Sidebar";

export default function AppLayout() {
  const location = useLocation();
  const isCanvasPage = location.pathname === '/canvas';

  return (
    <ThemeProvider defaultTheme="system" storageKey="maid-ui-theme">
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background">
          {/* Sidebar */}
          <AppSidebar />

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className={isCanvasPage ? "flex-1 pt-2 overflow-hidden" : "flex-1 p-6 sm:p-12 overflow-auto"}>
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
