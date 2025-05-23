"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import {
  BookOpen,
  Brain,
  FileText,
  Home,
  MessageSquare,
  Search,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { parseCookies, destroyCookie } from "nookies";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react"; // Add useState and useEffect

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Initial state
  const { token } = parseCookies();

  useEffect(() => {
    // Set authentication state on client side
    setIsAuthenticated(!!token);
  }, [token]);

  const routes = [
    { name: "Dashboard", path: "/", icon: <Home className="h-4 w-4 mr-2" /> },
    { name: "AI Chat", path: "/chat", icon: <MessageSquare className="h-4 w-4 mr-2" /> },
    { name: "Quiz Generator", path: "/quiz", icon: <Brain className="h-4 w-4 mr-2" /> },
    { name: "Summarize", path: "/summarize", icon: <FileText className="h-4 w-4 mr-2" /> },
    { name: "Search", path: "/search", icon: <Search className="h-4 w-4 mr-2" /> },
  ];

  const handleLogout = () => {
    destroyCookie(null, "token", { path: "/" });
    destroyCookie(null, "userEmail", { path: "/" });
    router.push("/login");
  };

  if (!token && pathname === "/login") {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-9 w-9 text-blue-600" />
            <span className="hidden text-3xl font-bold sm:inline-block">EduMind</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" asChild>
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      suppressHydrationWarning // Add this to suppress hydration warnings
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-9 w-9 text-blue-600" />
          <span className="hidden text-3xl font-bold sm:inline-block">EduMind</span>
        </div>
        <nav className="flex flex-1 justify-center items-center space-x-1 md:space-x-2">
          {isAuthenticated &&
            routes.map((route) => (
              <Button
                key={route.path}
                variant={pathname === route.path ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 px-2 md:px-4",
                  pathname === route.path
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                asChild
              >
                <Link href={route.path}>
                  {route.icon}
                  <span className="hidden md:inline-block">{route.name}</span>
                </Link>
              </Button>
            ))}
        </nav>
        <div className="flex items-center space-x-2">
          {isAuthenticated && (
            <>
              {/* <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button> */}
              <ModeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}