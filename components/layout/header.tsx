"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaceSafe } from "@/lib/workspace";
import { NotificationDropdown } from "./notification-dropdown";

// Page titles for each workspace
const pageTitles: Record<string, Record<string, string>> = {
  sales: {
    "/sales": "Dashboard",
    "/sales/assistant": "AI Assistant",
    "/sales/leads": "Leads",
    "/sales/contacts": "Contacts",
    "/sales/accounts": "Accounts",
    "/sales/opportunities": "Opportunities",
    "/sales/tasks": "Tasks",
    "/sales/pipeline": "Pipeline",
    "/sales/reports": "Reports",
  },
  cs: {
    "/cs": "Dashboard",
    "/cs/assistant": "AI Assistant",
    "/cs/tickets": "Tickets",
    "/cs/health": "Health Scores",
    "/cs/accounts": "Accounts",
    "/cs/playbooks": "Playbooks",
    "/cs/renewals": "Renewals",
    "/cs/tasks": "Tasks",
  },
  marketing: {
    "/marketing": "Dashboard",
    "/marketing/assistant": "AI Assistant",
    "/marketing/campaigns": "Campaigns",
    "/marketing/segments": "Segments",
    "/marketing/forms": "Forms",
    "/marketing/assets": "Assets",
  },
  // Legacy routes (current structure)
  legacy: {
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
  },
};

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { workspace } = useWorkspaceSafe();
  const [searchOpen, setSearchOpen] = useState(false);

  // Get page title from pathname
  const getPageTitle = () => {
    // Check workspace-specific titles first
    const workspaceTitles = pageTitles[workspace];
    if (workspaceTitles) {
      if (workspaceTitles[pathname]) return workspaceTitles[pathname];
      // Check for partial match
      const basePath = "/" + pathname.split("/").slice(1, 3).join("/");
      if (workspaceTitles[basePath]) return workspaceTitles[basePath];
    }
    
    // Check legacy titles
    const legacyTitles = pageTitles.legacy;
    if (legacyTitles[pathname]) return legacyTitles[pathname];
    const legacyBasePath = "/" + pathname.split("/")[1];
    if (legacyTitles[legacyBasePath]) return legacyTitles[legacyBasePath];
    
    // Check for modules path
    if (pathname.startsWith("/modules/")) {
      return "Custom Module";
    }
    
    // Check for settings path
    if (pathname.startsWith("/settings/")) {
      return "Settings";
    }
    
    return "Y CRM";
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
        <NotificationDropdown />

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
