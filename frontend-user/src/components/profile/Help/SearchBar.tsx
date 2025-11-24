import { Search } from "lucide-react";
import { Card, CardContent } from "../../../ui/card";
import { Input } from "../../../ui/input";
import { useTranslation } from "react-i18next";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function HelpSearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("help.searchPlaceholder")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardContent>
    </Card>
  );
}
