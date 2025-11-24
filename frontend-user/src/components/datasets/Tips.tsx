import { Card, CardContent } from "../../ui/card";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Tips() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-md">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{t("datasets.tipsTitle")}</h3>
            <ul className="mt-2 list-disc ml-5 space-y-1 text-sm text-muted-foreground">
              <li>{t("datasets.tip1")}</li>
              <li>{t("datasets.tip2")}</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
