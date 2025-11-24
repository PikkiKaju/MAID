import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { getStatusNumber, getStatusString } from "../../utils/functions";
import { useTranslation } from "react-i18next";

interface StatusSelectProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function StatusSelect({
  value,
  onChange,
  disabled = false,
}: StatusSelectProps) {
  const { t } = useTranslation();
  const statusValue = value !== undefined ? getStatusString(value) : "Draft";

  const handleChange = (newValue: string) => {
    onChange(getStatusNumber(newValue));
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        {t("projects.status")}
      </label>
      <Select
        value={statusValue}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Draft">{t("projects.draft")}</SelectItem>
          <SelectItem value="Completed">{t("projects.completed")}</SelectItem>
          <SelectItem value="Active">{t("projects.active")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
