import { useTranslation } from "react-i18next";

export function ProfileSettingsHeader() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("profile.profileSettings")}</h1>
      <p className="text-muted-foreground">{t("profile.manageSettings")}</p>
    </div>
  );
}
