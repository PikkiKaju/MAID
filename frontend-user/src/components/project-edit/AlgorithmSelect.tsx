import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

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
          <SelectItem value="linear">Regresja liniowa</SelectItem>
          <SelectItem value="ridge">Regresja grzbietowa</SelectItem>
          <SelectItem value="lasso">Lasso</SelectItem>
          <SelectItem value="svr">SVR</SelectItem>
          <SelectItem value="decision-tree">Drzewo decyzyjne</SelectItem>
          <SelectItem value="elasticnet">Elastic Net</SelectItem>
          <SelectItem value="random-forest">Random Forest</SelectItem>
          <SelectItem value="polynomial">Wielomianowa</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
