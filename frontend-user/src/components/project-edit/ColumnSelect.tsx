import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface ColumnSelectProps {
  label: string;
  value: string;
  columns: string[];
  loading: boolean;
  datasetId: string;
  optional?: boolean;
  onChange: (value: string) => void;
}

export default function ColumnSelect({
  label,
  value,
  columns,
  loading,
  datasetId,
  optional = false,
  onChange,
}: ColumnSelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {columns.length > 0 ? (
        <Select
          value={value || (optional ? "__CLEAR__" : undefined)}
          onValueChange={(val) => {
            // Zamień specjalną wartość na pusty string
            onChange(val === "__CLEAR__" ? "" : val);
          }}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={optional ? "Brak" : "Wybierz kolumnę"} />
          </SelectTrigger>
          <SelectContent>
            {optional && <SelectItem value="__CLEAR__">Brak</SelectItem>}
            {columns.map((column) => (
              <SelectItem key={column} value={column}>
                {column}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            datasetId === "00000000-0000-0000-0000-000000000000"
              ? "Wybierz dataset, aby załadować kolumny"
              : loading
              ? "Ładowanie kolumn..."
              : "Brak dostępnych kolumn"
          }
          disabled={loading}
          className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-card-foreground"
        />
      )}
    </div>
  );
}
