import {
  Search,
  User,
  ChevronDown,
  Menu,
  Sparkles,
  LogIn,
  UserPlus,
  XIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../features/auth/authSlice";
import { clearSearchTerm, setSearchTerm } from "../features/search/searchSlice";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ThemeToggle } from "./theme/ThemeToggle";
import { LanguageSwitcher } from "./language/LanguageSwitcher";
import { cn } from "../utilis/tailwind";
import { useEffect, useState } from "react";
import { profileService } from "../api/profileService";

export default function Header() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoggedIn, displayName } = useAppSelector((state) => state.auth);
  const searchTerm = useAppSelector((state) => state.search.term);
  const { open, isMobile, openMobile } = useSidebar();
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // Logo pokazuje się tylko gdy sidebar jest zamknięty
  const isSidebarOpen = isMobile ? openMobile : open;
  const showLogo = !isSidebarOpen;

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    dispatch(setSearchTerm(e.target.value));
  const handleSearchClear = () => dispatch(clearSearchTerm());

  // Pobierz avatar profilu gdy użytkownik jest zalogowany
  useEffect(() => {
    if (isLoggedIn) {
      loadProfileAvatar();
    } else {
      setProfileAvatar(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Nasłuchuj zmian avatara
  useEffect(() => {
    const handleAvatarUpdate = () => {
      if (isLoggedIn) {
        loadProfileAvatar();
      }
    };

    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () => {
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const loadProfileAvatar = async () => {
    try {
      const data = await profileService.getProfile();
      setProfileAvatar(data.avatar || null);
    } catch (err) {
      console.error("Error loading profile avatar for header:", err);
      setProfileAvatar(null);
    }
  };

  // Funkcja pomocnicza do sprawdzania, czy avatar to SVG
  const isSvgAvatar = (avatar: string | null): boolean => {
    if (!avatar) return false;
    const trimmed = avatar.trim();
    return (
      trimmed.startsWith("<svg") ||
      (trimmed.startsWith("<?xml") && trimmed.includes("<svg"))
    );
  };

  return (
    <header className="h-16 shadow-md bg-sidebar-accent/70 dark:bg-sidebar-accent/30 px-6 flex items-center justify-between">
      {/* Logo and Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-accent h-9 w-9 p-0 cursor-pointer">
          <Menu className="h-4 w-4" />
        </SidebarTrigger>

        {showLogo && (
          <div className={cn("flex items-center gap-3")}>
            <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Maid
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t("header.searchPlaceholder")}
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10 pr-8 bg-input-background border-0"
        />
        {searchTerm && (
          <button
            onClick={handleSearchClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800 cursor-pointer"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />

        {/* User Section */}
        {!isLoggedIn ? (
          <div className="flex gap-2">
            <Link
              to="/register"
              className="flex items-center gap-1 border border-gray-400 text-sm px-3 py-2 rounded-full hover:bg-accent transition cursor-pointer"
            >
              <UserPlus className="h-4 w-4" /> {t("header.register")}
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm px-3 py-2 rounded-full hover:opacity-90 transition cursor-pointer"
            >
              <LogIn className="h-4 w-4" /> {t("header.login")}
            </Link>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-accent px-3 py-2 rounded-lg transition-colors cursor-pointer">
              <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 bg-background flex items-center justify-center">
                {isSvgAvatar(profileAvatar) ? (
                  <div
                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                    dangerouslySetInnerHTML={{ __html: profileAvatar || "" }}
                  />
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={profileAvatar || undefined}
                      className="object-cover w-full h-full"
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <span className="font-medium hidden sm:inline">
                {displayName || t("header.user")}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:inline" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/profile">{t("header.profile")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">{t("header.settings")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help-support">{t("header.help")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive"
              >
                {t("header.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
