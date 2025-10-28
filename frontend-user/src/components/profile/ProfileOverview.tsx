import { Calendar, MapPin, Github, Linkedin } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Avatar, AvatarImage } from "../../ui/avatar";
import { Button } from "../../ui/button";

type ProfileOverviewProps = {
  avatarUrl: string;
  name: string;
  title: string;
  bio: string;
  location: string;
  joined: string;
};

export function ProfileOverview({
  avatarUrl,
  name,
  title,
  bio,
  location,
  joined,
}: ProfileOverviewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl} />
          </Avatar>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="text-muted-foreground">{title}</p>
          </div>

          <p className="text-sm text-center">{bio}</p>

          <div className="flex flex-col w-full space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{joined}</span>
            </div>
          </div>

          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="flex-1">
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Linkedin className="h-4 w-4 mr-2" />
              LinkedIn
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
