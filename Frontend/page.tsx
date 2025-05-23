"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseCookies, destroyCookie } from "nookies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, FileText, MessageSquare, Search, User } from "lucide-react";
import { DashboardStats } from "@/components/dashboard-stats";
import { RecentActivity } from "@/components/recent-activity";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const { token } = parseCookies();
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
      // Fetch user info
      fetch("/api/user", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.name) setUserName(data.name);
        })
        .catch((err) => console.error("Error fetching user:", err));
    }
  }, [router]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    destroyCookie(null, "token", { path: "/" });
    destroyCookie(null, "userEmail", { path: "/" });
    router.push("/login");
  };

  return (
    <div className="container space-y-6 py-6">
      <section className="space-y-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome to{" "}
            <span className="text-blue-600">Edu</span>Mind, {userName}
          </h1>
          <p className="text-muted-foreground">
            Your AI-powered learning assistant. Explore our tools to enhance your learning experience.
          </p>
        </div>
        <DashboardStats />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Chat
                </CardTitle>
                <CardDescription className="text-blue-100">Chat with our AI tutor for instant help</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Get personalized assistance with your studies, ask questions, and receive instant feedback.
                </p>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 px-4 py-2">
                <Button asChild className="w-full">
                  <Link href="/chat">Start Chatting</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Quiz Generator
                </CardTitle>
                <CardDescription className="text-purple-100">Create custom quizzes from your materials</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Upload your study materials and generate interactive quizzes to test your knowledge.
                </p>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 px-4 py-2">
                <Button asChild className="w-full">
                  <Link href="/quiz">Generate Quiz</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Summarize
                </CardTitle>
                <CardDescription className="text-amber-100">Get concise summaries of your documents</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Upload lengthy documents and get AI-generated summaries to help you study more efficiently.
                </p>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 px-4 py-2">
                <Button asChild className="w-full">
                  <Link href="/summarize">Summarize Now</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search
                </CardTitle>
                <CardDescription className="text-red-100">Find information across your materials</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Search through all your uploaded documents and past interactions to find what you need.
                </p>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 px-4 py-2">
                <Button asChild className="w-full">
                  <Link href="/search">Search Now</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </section>
    </div>
  );
}
