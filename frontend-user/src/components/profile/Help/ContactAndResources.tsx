import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { Mail, FileText, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ContactTab() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("help.contactTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div>
                <p className="font-medium">{t("help.emailSupport")}</p>
                <p className="text-sm text-muted-foreground">
                  mk307890@student.polsl.pl
                </p>
                <p className="text-sm text-muted-foreground">
                  ag307868@student.polsl.pl
                </p>
                <p className="text-sm text-muted-foreground">
                  dd307860@student.polsl.pl
                </p>
                <p className="text-sm text-muted-foreground">
                  ag307868@student.polsl.pl
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("help.responseTime")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ResourcesTab() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("help.resourcesTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("help.gettingStarted")}
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("help.apiDocs")}
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("help.bestPractices")}
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("help.troubleshooting")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
