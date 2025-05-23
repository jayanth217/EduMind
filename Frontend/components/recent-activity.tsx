"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, MessageSquare } from "lucide-react"; // Removed ArrowLeft since no back button is needed
import { useEffect, useState } from "react";

interface Activity {
  id: number;
  type: string;
  title: string;
  description: string;
  time: string;
  icon: string;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch("http://localhost:5000/recent-activity");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: Activity[] = await response.json();
        setActivities(data.sort((a, b) => b.time.localeCompare(a.time)));
      } catch (error) {
        console.error("Error fetching recent activities:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "Brain":
        return <Brain className="h-8 w-8 text-purple-500" />;
      case "MessageSquare":
        return <MessageSquare className="h-8 w-8 text-blue-500" />;
      default:
        return null;
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest interactions with EduMind</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center space-x-4 rounded-md border p-4"
            >
              <div className="rounded-full bg-muted p-2">{getIcon(activity.icon)}</div>
              <div className="flex-1 space-y-1">
                <p className="font-medium leading-none">{activity.title}</p>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">{activity.time}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}