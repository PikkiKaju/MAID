import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { isSvgAvatar } from "../../utilis/functions";

type PersonalInfoFormProps = {
  formData: PersonalInfo & { title?: string };
  onChange: (key: string, value: string) => void;
  onAvatarSelect?: (avatarId: string, avatarSvg: string) => void;
  selectedAvatarId?: string | null;
  selectedAvatarSvg?: string | null;
};

export function PersonalInfoForm({
  formData,
  onChange,
  onAvatarSelect,
  selectedAvatarId,
  selectedAvatarSvg,
}: PersonalInfoFormProps) {
  const { t } = useTranslation();
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentAvatar();
  }, []);

  // Aktualizuj wyświetlany avatar, gdy zmieni się wybrany avatar lub gdy załaduje się z serwera
  useEffect(() => {
    if (selectedAvatarSvg) {
      setCurrentAvatar(selectedAvatarSvg);
    }
  }, [selectedAvatarSvg]);

  const loadCurrentAvatar = async () => {
    try {
      const data = await profileService.getProfile();
      setCurrentAvatar(data.avatar || "");
    } catch (err) {
      console.error("Error loading avatar:", err);
    }
  };

  // Funkcja walidacji emaila
  const validateEmail = (email: string): string | null => {
    if (!email) {
      return null; // Pusty email jest OK (opcjonalne pole)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return t("profile.invalidEmail");
    }

    return null;
  };

  const handleEmailChange = (value: string) => {
    onChange("email", value);
    const error = validateEmail(value);
    setEmailError(error);
  };

  const handleAvatarSelect = async (avatarId: string) => {
    try {
      // Najpierw pobierz pełny obiekt avatara, aby uzyskać SVG string
      const avatars = await profileService.getAvatars();
      const selectedAvatar = avatars.find((a) => a.id === avatarId);

      if (!selectedAvatar) {
        throw new Error("Avatar not found");
      }

      // Tylko zaktualizuj lokalny stan - nie zapisuj do bazy
      setCurrentAvatar(selectedAvatar.avatar);

      // Przekaż informację o wybranym avatarze do rodzica
      if (onAvatarSelect) {
        onAvatarSelect(avatarId, selectedAvatar.avatar);
      }
    } catch (err) {
      console.error("Error selecting avatar:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {t("profile.personalInformation")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center bg-background relative">
            {isSvgAvatar(currentAvatar) ? (
              <div
                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                dangerouslySetInnerHTML={{ __html: currentAvatar }}
              />
            ) : currentAvatar ? (
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentAvatar} className="object-cover" />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-20 w-20">
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
              {t("profile.changePhoto")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t("profile.firstName")}</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => onChange("firstName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t("profile.lastName")}</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => onChange("lastName", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">{t("profile.title")}</Label>
          <Input
            id="title"
            value={formData.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder={t("profile.titlePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("profile.emailAddress")}</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            className={
              emailError
                ? "border-destructive border-2 focus-visible:border-destructive focus-visible:ring-destructive/50"
                : ""
            }
            aria-invalid={!!emailError}
          />
          {emailError && (
            <p className="text-sm text-destructive mt-1">{emailError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">{t("profile.bio")}</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => onChange("bio", e.target.value)}
            placeholder={t("profile.bioPlaceholder")}
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
