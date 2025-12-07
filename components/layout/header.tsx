"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/assistant": "AI Assistant",
  "/leads": "Leads",
  "/contacts": "Contacts",
  "/accounts": "Accounts",
  "/opportunities": "Opportunities",
  "/tasks": "Tasks",
  "/pipeline": "Pipeline",
  "/reports": "Reports",
  "/documents": "Documents",
  "/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  // Get page title from pathname
  const getPageTitle = () => {
    // Check exact match first
    if (pageTitles[pathname]) return pageTitles[pathname];
    
    // Check for partial match (e.g., /leads/123)
    const basePath = "/" + pathname.split("/")[1];
    return pageTitles[basePath] || "Y CRM";
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Page title (with left padding on mobile for menu button) */}
      <div className="flex items-center pl-12 lg:pl-0">
        <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
      </div>

      {/* Right side - Search, notifications, theme toggle */}
      <div className="flex items-center space-x-2">
        {/* Search */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 w-64"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
