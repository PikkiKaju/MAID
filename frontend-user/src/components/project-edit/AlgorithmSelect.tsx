import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { algorithms } from "../../data/algorithms";

interface AlgorithmSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function AlgorithmSelect({
  value,
  onChange,
}: AlgorithmSelectProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        Metoda obliczeń
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {algorithms.map((algorithm) => (
            <SelectItem key={algorithm.value} value={algorithm.value}>
              {algorithm.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
