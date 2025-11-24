import { paramConfig } from "../../data/paramConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface ParameterInputsProps {
  algorithm: string;
  parameters?: Record<string, string | number>;
  onChange: (parameters: Record<string, string | number>) => void;
  onHasUnsavedChanges: () => void;
  disabled?: boolean;
}

export default function ParameterInputs({
  algorithm,
  parameters = {},
  onChange,
  onHasUnsavedChanges,
  disabled = false,
}: ParameterInputsProps) {
  const config = paramConfig[algorithm];

  if (!config || config.length === 0) {
    return null;
  }

  const handleChange = (key: string, value: string | number) => {
    onChange({ ...parameters, [key]: value });
    onHasUnsavedChanges();
  };

  return (
    <div className="mb-6 space-y-3">
      {config.map((p) => (
        <div key={p.key}>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {p.label}
          </label>
          {p.type === "select" ? (
            <Select
              value={parameters[p.key] ? String(parameters[p.key]) : undefined}
              onValueChange={(value) => handleChange(p.key, value)}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wybierz" />
              </SelectTrigger>
              <SelectContent>
                {p.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <input
              type={p.type}
              min={p.min}
              value={parameters[p.key] ?? ""}
              onChange={(e) => handleChange(p.key, e.target.value)}
              disabled={disabled}
              className="border border-border px-2 py-1 w-full rounded bg-input-background dark:bg-input/30 text-card-foreground"
            />
          )}
        </div>
      ))}
    </div>
  );
}
