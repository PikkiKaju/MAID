import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Switch } from "../../ui/switch";

interface UploadDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  fileType: "csv" | "zip" | null;
  onUpload: (data: UploadFormData) => void;
  isUploading: boolean;
}

export interface UploadFormData {
  name: string;
  isPublic: boolean;
  columnTransform?: string;
  emptyTransform?: string;
}

export default function UploadDatasetDialog({
  open,
  onOpenChange,
  file,
  fileType,
  onUpload,
  isUploading,
}: UploadDatasetDialogProps) {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [columnTransform, setColumnTransform] = useState("remove");
  const [emptyTransform, setEmptyTransform] = useState("average");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or file changes
  useEffect(() => {
    if (open && file) {
      // Set default name from file name (without extension)
      const fileName = file.name;
      const nameWithoutExt =
        fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
      setName(nameWithoutExt);
      setIsPublic(true);
      setColumnTransform("remove");
      setEmptyTransform("average");
      setErrors({});
    }
  }, [open, file]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Nazwa jest wymagana";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const formData: UploadFormData = {
      name: name.trim(),
      isPublic,
    };

    if (fileType === "csv") {
      formData.columnTransform = columnTransform;
      formData.emptyTransform = emptyTransform;
    }

    onUpload(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Prześlij {fileType === "csv" ? "plik CSV" : "plik ZIP"}
          </DialogTitle>
          <DialogDescription>
            {file && (
              <span className="block mt-2 text-sm">
                Plik: <strong>{file.name}</strong>
              </span>
            )}
            Wypełnij poniższe informacje, aby przesłać plik.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Nazwa <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. patient_name"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {fileType === "csv" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="columnTransform">Transformacja kolumn</Label>
                <Select
                  value={columnTransform}
                  onValueChange={setColumnTransform}
                >
                  <SelectTrigger id="columnTransform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="convert">Convert</SelectItem>
                    <SelectItem value="remove">Remove</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emptyTransform">
                  Transformacja pustych wartości
                </Label>
                <Select
                  value={emptyTransform}
                  onValueChange={setEmptyTransform}
                >
                  <SelectTrigger id="emptyTransform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="remove">Remove</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="isPublic">Publiczny</Label>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? "Przesyłanie..." : "Prześlij"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
