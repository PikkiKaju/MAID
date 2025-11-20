import { Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../ui/button";

interface ProfileSettingsActionsProps {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function ProfileSettingsActions({
  onSave,
  onCancel,
  saving,
}: ProfileSettingsActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
      <Button className="gap-2" onClick={onSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("profile.saving")}
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            {t("profile.saveChanges")}
          </>
        )}
      </Button>
    </div>
  );
}
