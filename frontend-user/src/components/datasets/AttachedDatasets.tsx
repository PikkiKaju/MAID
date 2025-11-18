import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../ui/dropdown-menu";
import { Button } from "../../ui/button";
import { Calendar, Trash2, Eye, User, Heart, Lock } from "lucide-react";

interface Dataset {
  id: string;
  name: string;
  type: string;
  size?: string;
  rows?: number | string;
  uploadDate: string;
  author?: string;
  likes?: number;
  isPublic?: boolean;
  isLiked?: boolean;
}

interface Props {
  datasets: Dataset[];
  getFileIcon: (type: string) => React.ReactNode;
  hideHeader?: boolean; // Hide the default header
  onDelete?: (datasetId: string, datasetName: string) => void; // Callback for delete action
  onViewDetails?: (
    datasetId: string,
    datasetName: string,
    datasetType: string
  ) => void; // Callback for view details action
  onLike?: (datasetId: string) => void; // Callback for like action
  showLikeOption?: boolean; // Show like option in Actions menu
}

export default function AttachedDatasets({
  datasets,
  getFileIcon,
  hideHeader = false,
  onDelete,
  onViewDetails,
  onLike,
  showLikeOption = false,
}: Props) {
  const { t } = useTranslation();

  return (
    <div>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Moje Datasety ({datasets.length})
          </h2>
        </div>
      )}

      <div className="space-y-3">
        {datasets.map((dataset) => (
          <Card key={dataset.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-lg">
                    {getFileIcon(dataset.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{dataset.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      {dataset.size && dataset.size !== "N/A" && (
                        <>
                          <span>{dataset.size}</span>
                          <span>•</span>
                        </>
                      )}
                      {dataset.rows && dataset.rows !== "N/A" && (
                        <>
                          <span>{dataset.rows} records</span>
                          <span>•</span>
                        </>
                      )}
                      {dataset.author && (
                        <>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{dataset.author}</span>
                          </div>
                          <span>•</span>
                        </>
                      )}
                      {dataset.likes !== undefined && (
                        <>
                          <div className="flex items-center gap-1">
                            <Heart
                              className={`h-3 w-3 ${
                                dataset.isLiked
                                  ? "fill-red-500 text-red-500"
                                  : ""
                              }`}
                            />
                            <span>{dataset.likes}</span>
                          </div>
                          <span>•</span>
                        </>
                      )}
                      {dataset.isPublic !== undefined && !dataset.isPublic && (
                        <>
                          <div className="flex items-center gap-1">
                            <Lock className="h-3 w-3 text-blue-600" />
                            <span className="text-blue-600">Prywatny</span>
                          </div>
                          <span>•</span>
                        </>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Uploaded {dataset.uploadDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onViewDetails(dataset.id, dataset.name, dataset.type)
                      }
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {showLikeOption && onLike && (
                        <DropdownMenuItem onClick={() => onLike(dataset.id)}>
                          <Heart
                            className={`h-4 w-4 mr-2 ${
                              dataset.isLiked ? "fill-red-500 text-red-500" : ""
                            }`}
                          />
                          {dataset.isLiked
                            ? t("datasets.removeFromFavorites")
                            : t("datasets.addToFavorites")}
                        </DropdownMenuItem>
                      )}
                      {showLikeOption && onLike && onDelete && (
                        <div className="h-px bg-border my-1" />
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(dataset.id, dataset.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
