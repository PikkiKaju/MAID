import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import type { PersonalInfo } from "../../models/profile";
import { AvatarPicker } from "./AvatarPicker";
import { profileService } from "../../api/profileService";

type PersonalInfoFormProps = {
  formData: PersonalInfo & { title?: string };
  onChange: (key: string, value: string) => void;
  onAvatarSelect?: (avatarId: string) => void;
};

export function PersonalInfoForm({
  formData,
  onChange,
  onAvatarSelect,
}: PersonalInfoFormProps) {
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string>("");

  useEffect(() => {
    loadCurrentAvatar();
  }, []);

  const loadCurrentAvatar = async () => {
    try {
      const data = await profileService.getProfile();
      setCurrentAvatar(data.avatar);
    } catch (err) {
      console.error("Error loading avatar:", err);
    }
  };

  const handleAvatarSelect = async (avatarId: string) => {
    try {
      await profileService.updateAvatar(avatarId);
      await loadCurrentAvatar();
      if (onAvatarSelect) {
        onAvatarSelect(avatarId);
      }
    } catch (err) {
      console.error("Error updating avatar:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden">
            {currentAvatar && currentAvatar.startsWith("<svg") ? (
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: currentAvatar }}
              />
            ) : (
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentAvatar} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAvatarPickerOpen(true)}
            >
              Change Photo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => onChange("firstName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => onChange("lastName", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g., Data Scientist"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => onChange("bio", e.target.value)}
            placeholder="Tell us about yourself..."
            rows={3}
          />
        </div>

        <AvatarPicker
          open={avatarPickerOpen}
          onOpenChange={setAvatarPickerOpen}
          onSelect={handleAvatarSelect}
          currentAvatar={currentAvatar}
        />
      </CardContent>
    </Card>
  );
}
