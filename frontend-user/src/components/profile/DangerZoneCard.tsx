import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";

export function DangerZoneCard() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <h3 className="font-medium">Danger Zone</h3>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
          <Button variant="destructive" size="sm" className="w-full">
            Delete Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
