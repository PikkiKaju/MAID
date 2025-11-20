import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Copy, Check } from "lucide-react";
import { useToast } from "../toast/ToastProvider";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export default function ShareProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: Props) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [copied, setCopied] = useState(false);

  const projectUrl = `${window.location.origin}/projects/${projectId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setCopied(true);
      showSuccess(t("projects.linkCopied") || "Link skopiowany do schowka!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("projects.shareProject") || "Udostępnij projekt"}
          </DialogTitle>
          <DialogDescription>
            {t("projects.shareDescription") ||
              "Skopiuj link do projektu i udostępnij go innym."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("projects.projectLink") || "Link do projektu"}
            </label>
            <div className="flex gap-2">
              <Input
                value={projectUrl}
                readOnly
                className="flex-1"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
