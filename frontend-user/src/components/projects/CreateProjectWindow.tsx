import { useTranslation } from "react-i18next";
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
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";

interface CreateProjectWindowProps {
  isOpen: boolean;
  projectName: string;
  projectDescription: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function CreateProjectWindow({
  isOpen,
  projectName,
  projectDescription,
  onNameChange,
  onDescriptionChange,
  onClose,
  onConfirm,
}: CreateProjectWindowProps) {
  const { t } = useTranslation();

  const isFormValid =
    projectName.length >= 4 && projectDescription.length >= 10;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("projects.createNewProject")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("projects.projectNameHint")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="project-name" className="text-sm font-medium">
              {t("projects.projectNameLabel")} *
            </Label>
            <Input
              id="project-name"
              type="text"
              placeholder={t("projects.projectNamePlaceholder")}
              value={projectName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full mt-2"
            />
            {projectName.length > 0 && projectName.length < 4 && (
              <p className="text-xs text-destructive mt-1">
                {t("projects.projectNameMinLength")}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="project-description"
              className="text-sm font-medium"
            >
              {t("projects.projectDescriptionLabel")} *
            </Label>
            <Textarea
              id="project-description"
              placeholder={t("projects.projectDescriptionPlaceholder")}
              value={projectDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full mt-2 min-h-[100px]"
              rows={4}
            />
            {projectDescription.length > 0 &&
              projectDescription.length < 10 && (
                <p className="text-xs text-destructive mt-1">
                  {t("projects.projectDescriptionMinLength")}
                </p>
              )}
            {projectDescription.length >= 10 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("projects.projectDescriptionHint")}
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!isFormValid}
            className={!isFormValid ? "opacity-60 cursor-not-allowed" : ""}
          >
            {t("common.save")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CreateProjectWindow;
