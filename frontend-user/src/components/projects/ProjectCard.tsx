import { Calendar, User, Heart } from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Button } from "../../ui/button";
import { ImageWithFallback } from "../image/ImageWithFallback";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { formatProjectDate, isSvgAvatar } from "../../utils/functions";
import { useToast } from "../toast/ToastProvider";
import { useTranslation } from "react-i18next";

interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  category?: string;
  imageUrl: string;
  ownerAvatar?: string;
  isFavorited?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

export function ProjectCard({
  id,
  title,
  description,
  author,
  createdAt,
  imageUrl,
  ownerAvatar,
  isFavorited = false,
  onFavoriteToggle,
}: ProjectCardProps) {
  const [favorited, setFavorited] = useState(isFavorited);
  const navigate = useNavigate();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const { showError } = useToast();
  const { t } = useTranslation();

  // Synchronize local state with prop changes
  useEffect(() => {
    setFavorited(isFavorited);
  }, [isFavorited]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistically update UI
    setFavorited(!favorited);
    onFavoriteToggle?.(id);
  };

  const handleCardClick = () => {
    if (!isLoggedIn) {
      showError(
        t("projects.viewLoginRequired") ||
          "Musisz być zalogowany, aby zobaczyć szczegóły projektu."
      );
      return;
    }
    navigate(`/projects/${id}`, { state: { from: "/" } });
  };

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden h-full flex flex-col"
      onClick={handleCardClick}
    >
      <div className="relative">
        <ImageWithFallback
          src={imageUrl}
          alt={title}
          className="w-full h-48 object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-3 right-3 h-8 w-8 backdrop-blur-sm ${
            favorited
              ? "bg-red-100 hover:bg-red-200 text-red-600"
              : "bg-white/80 hover:bg-white/90"
          }`}
          onClick={handleFavoriteClick}
        >
          <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
        </Button>
      </div>

      <CardHeader className="pb-3">
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
          {description}
        </p>

        <div className="flex items-center justify-between text-sm text-muted-foreground mt-auto">
          <div className="flex items-center gap-2">
            {ownerAvatar ? (
              <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center bg-muted shrink-0">
                {isSvgAvatar(ownerAvatar) ? (
                  <div
                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                    dangerouslySetInnerHTML={{ __html: ownerAvatar }}
                  />
                ) : (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={ownerAvatar} className="object-cover" />
                    <AvatarFallback className="h-5 w-5">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ) : (
              <User className="h-3 w-3" />
            )}
            <span>{author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatProjectDate(createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
