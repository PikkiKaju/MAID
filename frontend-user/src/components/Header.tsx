import { Search, Menu, LogIn, UserPlus, XIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { clearSearchTerm, setSearchTerm } from "../features/search/searchSlice";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import { Input } from "../ui/input";
import { ThemeToggle } from "./theme/ThemeToggle";
import { LanguageSwitcher } from "./language/LanguageSwitcher";
import { useEffect, useState } from "react";
import { profileService } from "../api/profileService";
import { RootState } from "../store/store";
import Logo from "./Logo";
import ProfileDropdown from "./header/ProfileDropdown";

export default function Header() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isLoggedIn } = useAppSelector((state: RootState) => state.auth);
  const searchTerm = useAppSelector((state: RootState) => state.search.term);
  const { open, isMobile, openMobile } = useSidebar();
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // Logo is only shown when sidebar is closed
  const isSidebarOpen = isMobile ? openMobile : open;
  const showLogo = !isSidebarOpen;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    dispatch(setSearchTerm(e.target.value));
  const handleSearchClear = () => dispatch(clearSearchTerm());

  // Load profile avatar when user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadProfileAvatar();
    } else {
      setProfileAvatar(null);
    }
  }, [isLoggedIn]);

  // Listen for avatar changes
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

  return (
    <header className="h-16 shadow-md bg-sidebar-accent/70 dark:bg-sidebar-accent/30 px-6 flex items-center justify-between">
      {/* Logo and sidebar toggle */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-accent h-9 w-9 p-0 cursor-pointer">
          <Menu className="h-4 w-4" />
        </SidebarTrigger>

        {showLogo && <Logo />}
      </div>

      {/* Search bar */}
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

      {/* Controls bar */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />

        {/* User section */}
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
          <ProfileDropdown profileAvatar={profileAvatar} />
        )}
      </div>
    </header>
  );
}
