import { Play, Save, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";

interface ProjectEditTopbarProps {
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onStartCalculation: () => void;
  onDelete: () => void;
}

export default function ProjectEditTopbar({
  hasUnsavedChanges,
  onSave,
  onStartCalculation,
  onDelete,
}: ProjectEditTopbarProps) {
  return (
    <div className="flex justify-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg border border-border">
      <Button onClick={onSave} variant="default" className="rounded-full px-6">
        <Save className="h-4 w-4" />
        Zapisz zmiany
      </Button>

      <Button
        onClick={onStartCalculation}
        variant="default"
        className="rounded-full px-6"
        disabled={hasUnsavedChanges}
        title={
          hasUnsavedChanges ? "Najpierw zapisz zmiany" : "Uruchom obliczenia"
        }
      >
        <Play className="h-4 w-4" />
        Uruchom obliczenia
      </Button>

      <Button
        onClick={onDelete}
        variant="destructive"
        className="rounded-full px-6"
      >
        <Trash2 className="h-4 w-4" />
        Usuń projekt
      </Button>
    </div>
  );
}
