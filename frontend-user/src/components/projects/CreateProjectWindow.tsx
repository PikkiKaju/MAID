import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../../ui/alert-dialog";
import { Input } from "../../ui/input";

interface CreateProjectWindowProps {
  isOpen: boolean;
  projectName: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function CreateProjectWindow({
  isOpen,
  projectName,
  onChange,
  onClose,
  onConfirm,
}: CreateProjectWindowProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Utwórz nowy projekt</AlertDialogTitle>
          <AlertDialogDescription>
            Podaj nazwę projektu. Nazwa powinna mieć przynajmniej 4 znaki.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-2">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Nazwa projektu
          </label>
          <Input
            type="text"
            placeholder="Wpisz nazwę projektu..."
            value={projectName}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={projectName.length < 4}
            className={
              projectName.length < 4 ? "opacity-60 cursor-not-allowed" : ""
            }
          >
            Przejdź dalej
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CreateProjectWindow;
