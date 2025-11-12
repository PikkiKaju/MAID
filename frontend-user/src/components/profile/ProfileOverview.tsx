import { Calendar, User } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";

type ProfileOverviewProps = {
  avatarUrl: string;
  name: string;
  title: string;
  bio: string;
  joined: string;
};

export function ProfileOverview({
  avatarUrl,
  name,
  title,
  bio,
  joined,
}: ProfileOverviewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-24 w-24 rounded-full overflow-hidden">
            {avatarUrl && avatarUrl.startsWith("<svg") ? (
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: avatarUrl }}
              />
            ) : (
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="text-muted-foreground">{title}</p>
          </div>

          <p className="text-sm text-center">{bio}</p>

          <div className="flex flex-col w-full space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{joined}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
