import { Card, CardContent } from "../../ui/card";
import { FolderOpen, Database, Users, Star } from "lucide-react";
import type { ProfileStats } from "../../models/profile";

type StatsGridProps = { stats: ProfileStats };

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-semibold">{stats.totalProjects}</p>
              <p className="text-xs text-muted-foreground">Total Projects</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-semibold">{stats.totalDatasets}</p>
              <p className="text-xs text-muted-foreground">Total Datasets</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-2xl font-semibold">{stats.publicDatasets}</p>
              <p className="text-xs text-muted-foreground">Public Datasets</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-semibold">{stats.publicProjects}</p>
              <p className="text-xs text-muted-foreground">Public Projects</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
