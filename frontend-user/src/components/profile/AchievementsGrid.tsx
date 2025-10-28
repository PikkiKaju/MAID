import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import type { Achievement } from "../../models/profile";

type AchievementsGridProps = { achievements: Achievement[] };

export function AchievementsGrid({ achievements }: AchievementsGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Achievements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement, index) => {
            const Icon = achievement.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border"
              >
                <Icon className={`h-5 w-5 mt-0.5 ${achievement.color}`} />
                <div>
                  <p className="font-medium text-sm">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {achievement.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
