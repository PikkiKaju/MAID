import { DatasetMetadata } from "../../api/datasetService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface DatasetSelectProps {
  value: string;
  datasets: DatasetMetadata[];
  datasetSearch: string;
  onChange: (value: string) => void;
}

export default function DatasetSelect({
  value,
  datasets,
  datasetSearch,
  onChange,
}: DatasetSelectProps) {
  const filteredDatasets = datasets.filter((ds) =>
    ds.name.toLowerCase().includes(datasetSearch.toLowerCase())
  );

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        Dataset
      </label>
      <Select
        value={value || undefined}
        onValueChange={(val) => onChange(val || "")}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Wybierz dataset" />
        </SelectTrigger>
        <SelectContent>
          {filteredDatasets.map((ds) => (
            <SelectItem key={ds.id} value={ds.id}>
              {ds.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
