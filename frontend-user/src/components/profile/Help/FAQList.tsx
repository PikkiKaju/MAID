import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { HelpCircle } from "lucide-react";
import { Badge } from "../../../ui/badge";
import { useTranslation } from "react-i18next";
import type { FAQItem } from "../../../models/profile";

type FAQListProps = { items: FAQItem[] };

export function FAQList({ items }: FAQListProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          {t("help.faqTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{item.question}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t("help.noFAQResults")}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
