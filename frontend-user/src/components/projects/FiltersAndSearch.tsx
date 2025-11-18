import { useTranslation } from "react-i18next";
import { Input } from "../../ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface Props {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
}

export default function FiltersAndSearch({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t("projects.searchProjects")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-input-background border-0"
        />
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t("projects.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("projects.allStatus")}</SelectItem>
            <SelectItem value="draft">{t("projects.draft")}</SelectItem>
            <SelectItem value="completed">{t("projects.completed")}</SelectItem>
            <SelectItem value="active">{t("projects.active")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("projects.sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="modified">
              {t("projects.lastModified")}
            </SelectItem>
            <SelectItem value="created">{t("projects.dateCreated")}</SelectItem>
            <SelectItem value="name">{t("projects.name")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
