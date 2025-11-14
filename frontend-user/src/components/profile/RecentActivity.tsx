import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { FolderOpen, Database } from "lucide-react";
import type { Activity } from "../../models/profile";

type RecentActivityProps = { activity: Activity[] };

export function RecentActivity({ activity }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activity.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  item.type === "project"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-green-100 text-green-600"
                }`}
              >
                {item.type === "project" ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
