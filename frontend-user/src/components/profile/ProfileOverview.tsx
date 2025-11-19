import { Calendar, User, Mail } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { isSvgAvatar } from "../../utilis/functions";

type ProfileOverviewProps = {
  avatarUrl: string;
  name: string;
  title: string;
  bio: string;
  email: string;
  joined: string;
};

export function ProfileOverview({
  avatarUrl,
  name,
  title,
  bio,
  email,
  joined,
}: ProfileOverviewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-24 w-24 rounded-full overflow-hidden flex items-center justify-center bg-background">
            {isSvgAvatar(avatarUrl) ? (
              <div
                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                dangerouslySetInnerHTML={{ __html: avatarUrl }}
              />
            ) : (
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} className="object-cover" />
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
            {email && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{email}</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{joined}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
