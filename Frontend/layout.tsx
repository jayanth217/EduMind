import type React from "react";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";
import "@/app/globals.css";
import { ChatProvider } from "./ChatContext"; // Import ChatProvider
import ChatSidebar from "./ChatSidebar"; // Import ChatSidebar

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "EduMind AI Learning Platform",
  description: "AI-powered learning platform for students and educators",
  generator: "v0.dev",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ChatProvider> {/* Wrap the app with ChatProvider */}
            <div className="flex min-h-screen">
              {/* Main Content */}
              <div className="flex flex-col flex-1">
                <MainNav />
                <main className="flex-1">{children}</main>
                <SiteFooter />
              </div>
              {/* Chat Sidebar */}
            </div>
            <Toaster />
          </ChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
