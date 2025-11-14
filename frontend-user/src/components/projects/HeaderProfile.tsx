import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Plus } from "lucide-react";

interface Props {
  onNewProject: () => void;
}

export default function HeaderProfile({ onNewProject }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{t("projects.title")}</h1>
        <p className="text-muted-foreground">
          {t("projects.manageDescription", {
            defaultValue: "Zarządzaj i organizuj swoje projekty data science",
          })}
        </p>
      </div>
      <Button className="gap-2" onClick={onNewProject}>
        <Plus className="h-4 w-4" />
        {t("projects.createProject")}
      </Button>
    </div>
  );
}
