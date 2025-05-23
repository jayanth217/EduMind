"use client";

import type React from "react";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";
import { usePathname } from "next/navigation";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Block rendering of dashboard content if no token and not on login page
  if (!isLoginPage && !token) {
    return null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex min-h-screen flex-col">
            {!isLoginPage && token && <MainNav />}
            <main className="flex-1">{children}</main>
            {!isLoginPage && token && <SiteFooter />}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
