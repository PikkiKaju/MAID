import { useTranslation } from "react-i18next";

export default function HeaderDatasets() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{t("datasets.title")}</h1>
        <p className="text-muted-foreground">
          {t("datasets.description", {
            defaultValue:
              "Prześlij i zarządzaj zbiorami danych dla swojego projektu",
          })}
        </p>
      </div>
    </div>
  );
}
