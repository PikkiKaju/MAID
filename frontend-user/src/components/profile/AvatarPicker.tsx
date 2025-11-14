import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { profileService, type AvatarOption } from "../../api/profileService";
import { Loader2 } from "lucide-react";

type AvatarPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (avatarId: string) => void;
  currentAvatar?: string;
};

export function AvatarPicker({
  open,
  onOpenChange,
  onSelect,
}: AvatarPickerProps) {
  const { t } = useTranslation();
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadAvatars();
    }
  }, [open]);

  const loadAvatars = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await profileService.getAvatars();
      setAvatars(data);
    } catch (err) {
      setError(t("profile.failedToLoadAvatars"));
      console.error("Error loading avatars:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
  };

  const handleConfirm = () => {
    if (selectedAvatarId) {
      onSelect(selectedAvatarId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("profile.chooseAvatar")}</DialogTitle>
          <DialogDescription>
            {t("profile.selectAvatarDescription")}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {error && <div className="text-sm text-destructive py-4">{error}</div>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 py-4">
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleSelect(avatar.id)}
                  className={`relative p-2 rounded-lg border-2 transition-all hover:scale-105 cursor-pointer ${
                    selectedAvatarId === avatar.id
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className="w-full aspect-square rounded-full overflow-hidden flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                    dangerouslySetInnerHTML={{ __html: avatar.avatar }}
                  />
                  {selectedAvatarId === avatar.id && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleConfirm} disabled={!selectedAvatarId}>
                {t("profile.selectAvatar")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
