import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { Mail, FileText, ExternalLink } from "lucide-react";

export function ContactTab() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send us a Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">
                  ag307868@polsl.pl
                </p>
                <p className="text-sm text-muted-foreground">
                  ag307868@student.polsl.pl
                </p>
                <p className="text-sm text-muted-foreground">
                  ag307868@polsl.pl
                </p>
                <p className="text-sm text-muted-foreground">
                  ag307868@polsl.pl
                </p>
                <p className="text-xs text-muted-foreground">
                  Response within 24 hours
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ResourcesTab() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Getting Started Guide
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              API Documentation
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Best Practices
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Troubleshooting
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
