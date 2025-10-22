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
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../features/auth/authSlice";
import { clearSearchTerm, setSearchTerm } from "../features/search/searchSlice";
import { SidebarTrigger } from "../ui/sidebar";
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

export default function Header() {
  const dispatch = useAppDispatch();
  const { isLoggedIn, displayName } = useAppSelector((state) => state.auth);
  const searchTerm = useAppSelector((state) => state.search.term);

  const handleLogout = () => dispatch(logout());
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    dispatch(setSearchTerm(e.target.value));
  const handleSearchClear = () => dispatch(clearSearchTerm());

  return (
    <header className="h-16 border-b bg-background px-6 flex items-center justify-between">
      {/* Logo and Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-accent h-9 w-9 p-0">
          <Menu className="h-4 w-4" />
        </SidebarTrigger>

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Maid
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Szukaj projektów, danych..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10 pr-8 bg-input-background border-0"
        />
        {searchTerm && (
          <button
            onClick={handleSearchClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800"
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
              className="flex items-center gap-1 border border-gray-400 text-sm px-3 py-2 rounded-full hover:bg-accent transition"
            >
              <UserPlus className="h-4 w-4" /> Rejestracja
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm px-3 py-2 rounded-full hover:opacity-90 transition"
            >
              <LogIn className="h-4 w-4" /> Logowanie
            </Link>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-accent px-3 py-2 rounded-lg transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="font-medium hidden sm:inline">
                {displayName || "Użytkownik"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:inline" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/profile">Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">Ustawienia</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help-support">Pomoc i Wsparcie</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive"
              >
                Wyloguj
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
