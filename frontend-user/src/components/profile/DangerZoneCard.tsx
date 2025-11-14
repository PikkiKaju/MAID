import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";

type DangerZoneCardProps = {
  onDelete: () => void;
};

export function DangerZoneCard({ onDelete }: DangerZoneCardProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <h3 className="font-medium">{t("profile.dangerZoneTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("profile.deleteAccountDescription")}
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={onDelete}
          >
            {t("profile.deleteAccountButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
