import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { Label } from "../../../ui/label";
import { Textarea } from "../../../ui/textarea";
import { Input } from "../../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import {
  Mail,
  MessageCircle,
  Phone,
  FileText,
  Video,
  ExternalLink,
  Send,
} from "lucide-react";

export function ContactTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send us a Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">Technical Issue</SelectItem>
                <SelectItem value="billing">Billing Question</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="general">General Inquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Your Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="alex.chen@example.com"
              defaultValue="alex.chen@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Describe your issue or question..."
              rows={5}
            />
          </div>

          <Button className="w-full">
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other Ways to Reach Us</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">support@maid.ai</p>
                <p className="text-xs text-muted-foreground">
                  Response within 24 hours
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Live Chat</p>
                <p className="text-sm text-muted-foreground">
                  Available 9 AM - 6 PM PST
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Start Chat
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium">Phone Support</p>
                <p className="text-sm text-muted-foreground">
                  +1 (555) 123-4567
                </p>
                <p className="text-xs text-muted-foreground">
                  Enterprise customers only
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Emergency Support</h4>
            <p className="text-sm text-muted-foreground mb-3">
              For critical issues affecting your production systems
            </p>
            <Button variant="destructive" size="sm">
              Report Critical Issue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ResourcesTab() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Tutorials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Creating Your First Project
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Working with Datasets
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Collaboration Features
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Advanced Tips & Tricks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
