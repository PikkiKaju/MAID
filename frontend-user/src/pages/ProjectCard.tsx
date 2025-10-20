import { Calendar, User, Heart } from "lucide-react";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ImageWithFallback } from "../components/image/ImageWithFallback";

interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  category: string;
  imageUrl: string;
  isFavorited?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

export function ProjectCard({
  id,
  title,
  description,
  author,
  createdAt,
  category,
  imageUrl,
  isFavorited = false,
  onFavoriteToggle,
}: ProjectCardProps) {
  const [favorited, setFavorited] = useState(isFavorited);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorited(!favorited);
    onFavoriteToggle?.(id);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden">
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
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <Badge variant="secondary" className="shrink-0">
            {category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {description}
        </p>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{createdAt}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
