import { User, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout } from "../../features/auth/authSlice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { isSvgAvatar } from "../../utils/functions";
import { RootState } from "../../store/store";

interface ProfileDropdownProps {
  profileAvatar: string | null;
}

export default function ProfileDropdown({
  profileAvatar,
}: ProfileDropdownProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { displayName } = useAppSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
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
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          {t("header.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
