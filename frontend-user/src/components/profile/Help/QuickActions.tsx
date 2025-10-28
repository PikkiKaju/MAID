import { Card, CardContent } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { ExternalLink } from "lucide-react";
import type { QuickAction } from "../../../models/profile";

type QuickActionsProps = { items: QuickAction[] };

export function QuickActions({ items }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((action, index) => {
        const Icon = action.icon;
        return (
          <Card
            key={index}
            className="hover:shadow-md transition-shadow cursor-pointer"
          >
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div
                  className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center ${
                    action.color === "blue"
                      ? "bg-blue-100 text-blue-600"
                      : action.color === "purple"
                      ? "bg-purple-100 text-purple-600"
                      : action.color === "green"
                      ? "bg-green-100 text-green-600"
                      : "bg-orange-100 text-orange-600"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
