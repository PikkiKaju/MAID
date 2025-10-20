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
            <h3 className="text-xl font-semibold">Add Dataset to Project</h3>
            <p className="text-muted-foreground text-lg">
              Drag & drop your dataset files here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports CSV, JSON, Excel, Parquet, and compressed files (ZIP,
              TAR)
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={onBrowseClick} className="gap-2">
              <Upload className="h-5 w-5" />
              Browse Files
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Import from URL
            </Button>
          </div>

          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && onFileSelected(e.target.files)}
            accept=".csv,.json,.xlsx,.xls,.parquet,.zip,.tar,.gz"
          />

          {uploading && (
            <div className="max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
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
