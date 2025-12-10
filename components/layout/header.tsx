"use client";

import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "./notification-dropdown";
import { OmniSearch } from "./omni-search";

// Page titles mapping
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

  // Get page title from pathname
  const getPageTitle = () => {
    // Direct match
    if (pageTitles[pathname]) return pageTitles[pathname];
    
    // Check base path
    const basePath = "/" + pathname.split("/")[1];
    if (pageTitles[basePath]) return pageTitles[basePath];
    
    // Check for modules path
    if (pathname.startsWith("/modules/")) {
      return "Custom Module";
    }
    
    // Check for settings subpages
    if (pathname.startsWith("/settings/")) {
      return "Settings";
    }
    
    return "Y CRM";
  };

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Page title */}
      <div className="flex items-center pl-12 lg:pl-0">
        <h1 className="text-lg font-semibold text-foreground">{getPageTitle()}</h1>
      </div>

      {/* Right side - Search, notifications, theme toggle */}
      <div className="flex items-center gap-2">
        {/* Omni Search */}
        <OmniSearch />

        {/* Notifications */}
        <NotificationDropdown />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
