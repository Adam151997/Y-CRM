"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  Settings,
  FileText,
  Box,
  Package,
  Layers,
  Tag,
  Briefcase,
  Users,
  Star,
  ShoppingCart,
  Building2,
  Truck,
  Folder,
  Award,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { 
  useWorkspace, 
  getWorkspaceNavigation,
  type NavSection,
} from "@/lib/workspace";

// Map icon names to Lucide components for custom modules
const iconMap: Record<string, LucideIcon> = {
  box: Box,
  package: Package,
  layers: Layers,
  tag: Tag,
  briefcase: Briefcase,
  users: Users,
  "file-text": FileText,
  star: Star,
  "shopping-cart": ShoppingCart,
  "building-2": Building2,
  truck: Truck,
  folder: Folder,
  award: Award,
};

// Secondary navigation (shared across workspaces)
const secondaryNavigation = [
  {
    name: "Documents",
    href: "/documents",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface CustomModule {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
  icon: string;
  showInSidebar: boolean;
}

interface DynamicSidebarProps {
  onNavigate?: () => void;
}

export function DynamicSidebar({ onNavigate }: DynamicSidebarProps) {
  const pathname = usePathname();
  const { workspace, config } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [customModules, setCustomModules] = useState<CustomModule[]>([]);

  // Get navigation for current workspace
  const navigation = getWorkspaceNavigation(workspace);

  // Fetch custom modules
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await fetch("/api/custom-modules");
        if (response.ok) {
          const data = await response.json();
          setCustomModules(
            (data.modules || []).filter((m: CustomModule) => m.showInSidebar)
          );
        }
      } catch (error) {
        console.error("Failed to fetch custom modules:", error);
      }
    };

    fetchModules();

    // Listen for custom module updates
    const handleModuleUpdate = () => fetchModules();
    window.addEventListener("custom-modules-updated", handleModuleUpdate);
    return () => {
      window.removeEventListener("custom-modules-updated", handleModuleUpdate);
    };
  }, []);

  const handleNavClick = () => {
    onNavigate?.();
  };

  // Check if a nav item is active
  const isActive = (href: string) => {
    if (href === `/${workspace}`) {
      return pathname === href || pathname === `/${workspace}/`;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo & Collapse Button */}
      <div className="flex items-center justify-between h-16 px-4 border-b">
        {!collapsed && (
          <Link href={`/${workspace}`} className="flex items-center space-x-2" onClick={handleNavClick}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bgColor)}>
              <span className="text-white font-bold text-lg">Y</span>
            </div>
            <span className="font-semibold text-lg">CRM</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && "mx-auto", "hidden lg:flex")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Workspace Switcher */}
      <div className="p-3 border-b">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* Voice Command Button */}
      <div className="p-3">
        <Link href={`/${workspace}/assistant`} onClick={handleNavClick}>
          <Button
            className={cn(
              "w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700",
              collapsed && "px-2"
            )}
          >
            <Mic className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Voice Command</span>}
          </Button>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {/* Section Title */}
            {section.title && !collapsed && (
              <div className="px-3 py-2 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </p>
              </div>
            )}
            {section.title && collapsed && sectionIndex > 0 && (
              <div className="my-2 mx-2 border-t" />
            )}
            
            {/* Section Items */}
            {section.items.map((item) => {
              const active = isActive(item.href);
              const isHighlight = item.highlight;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    active
                      ? `bg-primary/10 ${config.textColor}`
                      : isHighlight
                      ? "text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/50"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                  {!collapsed && item.name}
                  {!collapsed && item.badge && (
                    <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Custom Modules Section (Global) */}
        {customModules.length > 0 && (
          <>
            <div className="my-3 mx-2 border-t" />
            {!collapsed && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Custom Modules
                </p>
              </div>
            )}
            {customModules.map((module) => {
              const moduleActive = pathname.startsWith(`/modules/${module.slug}`);
              const IconComponent = iconMap[module.icon] || Box;
              
              return (
                <Link
                  key={module.id}
                  href={`/modules/${module.slug}`}
                  prefetch={true}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    moduleActive
                      ? `bg-primary/10 ${config.textColor}`
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? module.pluralName : undefined}
                >
                  <IconComponent className={cn("h-5 w-5", !collapsed && "mr-3")} />
                  {!collapsed && module.pluralName}
                </Link>
              );
            })}
          </>
        )}

        {/* Secondary Navigation */}
        <div className="my-3 mx-2 border-t" />
        {secondaryNavigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              onClick={handleNavClick}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                active
                  ? `bg-primary/10 ${config.textColor}`
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t p-4">
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "space-x-3"
          )}
        >
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">My Account</p>
              <p className="text-xs text-muted-foreground truncate">Free Plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
