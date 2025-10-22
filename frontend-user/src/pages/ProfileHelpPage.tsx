import { useState } from "react";
import {
  Search,
  HelpCircle,
  Mail,
  MessageCircle,
  FileText,
  Video,
  ExternalLink,
  Send,
  Book,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";

export function ProfileHelpPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const faqItems = [
    {
      question: "How do I create a new project?",
      answer:
        "Click the 'New Project' button in the My Projects section and follow the setup wizard.",
      category: "Projects",
    },
    {
      question: "What file formats are supported for datasets?",
      answer:
        "We support CSV, JSON, Excel, Parquet, and compressed files (ZIP, TAR, GZ).",
      category: "Datasets",
    },
    {
      question: "How can I make my project public?",
      answer:
        "In your project settings, toggle the visibility switch from Private to Public.",
      category: "Projects",
    },
    {
      question: "How do I delete my account?",
      answer: "Go to Profile Settings and scroll to the Danger Zone section.",
      category: "Account",
    },
    {
      question: "Can I collaborate with other users?",
      answer:
        "Yes, you can share projects and collaborate in real-time with team members.",
      category: "Collaboration",
    },
    {
      question: "What are the storage limits?",
      answer:
        "Free accounts get 5GB storage. Pro accounts get 100GB with unlimited projects.",
      category: "Account",
    },
  ];

  const quickActions = [
    {
      title: "Documentation",
      description: "Complete guides and API reference",
      icon: Book,
      href: "#",
      color: "blue",
    },
    {
      title: "Video Tutorials",
      description: "Step-by-step video walkthroughs",
      icon: Video,
      href: "#",
      color: "purple",
    },
    {
      title: "Community Forum",
      description: "Connect with other users",
      icon: MessageCircle,
      href: "#",
      color: "green",
    },
    {
      title: "Contact Support",
      description: "Get help from our team",
      icon: Phone,
      href: "#",
      color: "orange",
    },
  ];

  const filteredFAQ = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Help & Support</h1>
        <p className="text-muted-foreground">
          Find answers, get help, and learn more about Maid
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for help articles, FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
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

      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact Us</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredFAQ.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{item.question}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredFAQ.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No FAQ items found matching your search.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
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
                      <p className="text-sm text-muted-foreground">
                        support@maid.ai
                      </p>
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
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
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
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Getting Started Guide
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    API Documentation
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Best Practices
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
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
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Creating Your First Project
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Working with Datasets
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Collaboration Features
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Advanced Tips & Tricks
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
