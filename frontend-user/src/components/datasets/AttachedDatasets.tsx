import React from "react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../ui/dropdown-menu";
import { Button } from "../../ui/button";
import {
  Calendar,
  Download,
  Upload,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";

interface Dataset {
  id: string;
  name: string;
  type: string;
  status: string;
  size: string;
  rows: number | string;
  uploadDate: string;
}

interface Props {
  datasets: Dataset[];
  getFileIcon: (type: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
}

export default function AttachedDatasets({
  datasets,
  getFileIcon,
  getStatusColor,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Attached Datasets ({datasets.length})
        </h2>
        <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Connect External Dataset
        </Button>
      </div>

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
                      <Badge className={getStatusColor(dataset.status)}>
                        {dataset.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{dataset.size}</span>
                      <span>•</span>
                      <span>{dataset.rows} records</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Uploaded {dataset.uploadDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Upload className="h-4 w-4 mr-2" /> Replace
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Remove from Project
                      </DropdownMenuItem>
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
