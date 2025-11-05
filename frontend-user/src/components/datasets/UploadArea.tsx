import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../ui/card";
import { CloudUpload, Upload, ExternalLink } from "lucide-react";
import { Button } from "../../ui/button";
import { Progress } from "../../ui/progress";

interface Props {
  dragActive: boolean;
  uploading: boolean;
  uploadProgress: number;
  onBrowseClick: () => void;
  onFileSelected: (files: FileList) => void;
}

export default function UploadArea({
  dragActive,
  uploading,
  uploadProgress,
  onBrowseClick,
  onFileSelected,
}: Props) {
  const { t } = useTranslation();

  return (
    <Card
      className={`border-2 border-dashed transition-all duration-200 ${
        dragActive
          ? "border-primary bg-primary/5 shadow-lg scale-105"
          : "border-border hover:border-primary/50 hover:bg-primary/2"
      }`}
    >
      <CardContent className="p-12">
        <div
          className={`text-center space-y-6 transition-all duration-200 ${
            dragActive ? "scale-105" : ""
          }`}
        >
          <div
            className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
              dragActive ? "bg-primary/20 scale-110" : "bg-primary/10"
            }`}
          >
            <CloudUpload
              className={`h-10 w-10 text-primary transition-all duration-200 ${
                dragActive ? "scale-110" : ""
              }`}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold">
              {t("datasets.addDataset")}
            </h3>
            <p className="text-muted-foreground text-lg">
              {t("datasets.uploadArea")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("datasets.supportedFormats", {
                defaultValue:
                  "Obsługiwane formaty: CSV, JSON, Excel, Parquet oraz skompresowane pliki (ZIP, TAR)",
              })}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={onBrowseClick} className="gap-2">
              <Upload className="h-5 w-5" />
              {t("datasets.browseFiles")}
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {t("datasets.importFromUrl")}
            </Button>
          </div>

          {uploading && (
            <div className="max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t("datasets.uploading")}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
