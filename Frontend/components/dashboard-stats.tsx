"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Clock, Brain } from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardStats {
  total_study_sessions: number;
  quizzes_completed: number;
  average_score: number;
  study_streak: number;
  trends: {
    sessions: number;
    quizzes: number;
    score: number;
  };
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    total_study_sessions: 0,
    quizzes_completed: 0,
    average_score: 0,
    study_streak: 0,
    trends: { sessions: 0, quizzes: 0, score: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:5000/dashboard-stats");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: DashboardStats = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Study Sessions</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_study_sessions}</div>
          <p className="text-xs text-muted-foreground">
            {stats.trends.sessions > 0 ? `+${stats.trends.sessions}%` : `${stats.trends.sessions}%`} from last week
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quizzes Completed</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.quizzes_completed}</div>
          <p className="text-xs text-muted-foreground">
            {stats.trends.quizzes > 0 ? `+${stats.trends.quizzes}%` : `${stats.trends.quizzes}%`} from last week
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.average_score}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.trends.score > 0 ? `+${stats.trends.score}%` : `${stats.trends.score}%`} from last week
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.study_streak} days</div>
          <p className="text-xs text-muted-foreground">Keep it up!</p>
        </CardContent>
      </Card>
    </div>
  );
}