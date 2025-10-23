import {
  Calendar,
  MapPin,
  Github,
  Linkedin,
  Star,
  FolderOpen,
  Database,
  Users,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";

export function ProfileInfoPage() {
  const profileStats = {
    totalProjects: 12,
    publicProjects: 8,
    totalDatasets: 24,
    followers: 128,
    following: 45,
    contributions: 156,
  };

  const recentActivity = [
    {
      type: "project",
      title: "Updated Customer Sentiment Analysis",
      date: "2 hours ago",
    },
    { type: "dataset", title: "Added sales_data_2024.xlsx", date: "1 day ago" },
    {
      type: "project",
      title: "Created Medical Image Classification",
      date: "3 days ago",
    },
    {
      type: "dataset",
      title: "Uploaded product_images.zip",
      date: "5 days ago",
    },
    {
      type: "project",
      title: "Shared Real Estate Price Prediction",
      date: "1 week ago",
    },
  ];

  const skills = [
    { name: "Machine Learning", level: 90 },
    { name: "Python", level: 95 },
    { name: "Data Visualization", level: 85 },
    { name: "Deep Learning", level: 80 },
    { name: "SQL", level: 88 },
    { name: "Statistics", level: 92 },
  ];

  const achievements = [
    {
      title: "Early Adopter",
      description: "Joined in the first month",
      icon: Trophy,
      color: "text-yellow-600",
    },
    {
      title: "Data Expert",
      description: "Completed 10+ projects",
      icon: Star,
      color: "text-blue-600",
    },
    {
      title: "Community Builder",
      description: "Helped 50+ users",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Open Source",
      description: "5 public projects",
      icon: Github,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile Information</h1>
        <p className="text-muted-foreground">
          Your activity and contributions overview
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face" />
                </Avatar>

                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Alex Chen</h2>
                  <p className="text-muted-foreground">Data Scientist</p>
                </div>

                <p className="text-sm text-center">
                  Data scientist passionate about machine learning and AI
                  applications. Building innovative solutions for real-world
                  problems.
                </p>

                <div className="flex flex-col w-full space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>San Francisco, CA</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined October 2024</span>
                  </div>
                </div>

                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats and Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-semibold">
                      {profileStats.totalProjects}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Projects
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-semibold">
                      {profileStats.totalDatasets}
                    </p>
                    <p className="text-xs text-muted-foreground">Datasets</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-semibold">
                      {profileStats.followers}
                    </p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-semibold">
                      {profileStats.publicProjects}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Public Projects
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-semibold">
                      {profileStats.contributions}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contributions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-semibold">
                      {profileStats.following}
                    </p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skills.map((skill) => (
                  <div key={skill.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-muted-foreground">
                        {skill.level}%
                      </span>
                    </div>
                    <Progress value={skill.level} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        activity.type === "project"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {activity.type === "project" ? (
                        <FolderOpen className="h-4 w-4" />
                      ) : (
                        <Database className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Achievements */}
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
    </div>
  );
}
