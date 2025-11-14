import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Separator } from "../../ui/separator";
import type { Notifications } from "../../models/profile";

type NotificationsCardProps = {
  notifications: Notifications;
  onChange: (key: keyof Notifications, value: boolean) => void;
};

export function NotificationsCard({
  notifications,
  onChange,
}: NotificationsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Updates</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about your account
              </p>
            </div>
            <Switch
              checked={notifications.emailUpdates}
              onCheckedChange={(value) => onChange("emailUpdates", value)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Project Activity</Label>
              <p className="text-sm text-muted-foreground">
                Notifications about your projects
              </p>
            </div>
            <Switch
              checked={notifications.projectActivity}
              onCheckedChange={(value) => onChange("projectActivity", value)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Security Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Important security notifications
              </p>
            </div>
            <Switch
              checked={notifications.securityAlerts}
              onCheckedChange={(value) => onChange("securityAlerts", value)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Summary of platform activity
              </p>
            </div>
            <Switch
              checked={notifications.weeklyDigest}
              onCheckedChange={(value) => onChange("weeklyDigest", value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
