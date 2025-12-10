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
import { Logo } from "@/components/ui/logo";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { 
  useWorkspace, 
  getWorkspaceNavigation,
  GLOBAL_NAVIGATION,
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
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface CustomModule {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
  icon: string;
  showInSidebar: boolean;
}

interface Branding {
  brandName: string;
  brandLogo: string | null;
}

interface DynamicSidebarProps {
  onNavigate?: () => void;
}

export function DynamicSidebar({ onNavigate }: DynamicSidebarProps) {
  const pathname = usePathname();
  const { workspace, config } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [customModules, setCustomModules] = useState<CustomModule[]>([]);
  const [branding, setBranding] = useState<Branding>({ brandName: "Y CRM", brandLogo: null });

  const navigation = getWorkspaceNavigation(workspace);

  // Fetch branding
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch("/api/organization/branding");
        if (response.ok) {
          const data = await response.json();
          setBranding({
            brandName: data.brandName || "Y CRM",
            brandLogo: data.brandLogo || null,
          });
        }
      } catch (error) {
        console.error("Failed to fetch branding:", error);
      }
    };

    fetchBranding();

    // Listen for branding updates
    const handleBrandingUpdate = () => {
      fetchBranding();
    };

    window.addEventListener("branding-updated", handleBrandingUpdate);
    return () => {
      window.removeEventListener("branding-updated", handleBrandingUpdate);
    };
  }, []);

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

    const handleModuleUpdate = () => fetchModules();
    window.addEventListener("custom-modules-updated", handleModuleUpdate);
    return () => {
      window.removeEventListener("custom-modules-updated", handleModuleUpdate);
    };
  }, []);

  const handleNavClick = () => {
    onNavigate?.();
  };

  const isActive = (href: string) => {
    if (href === `/${workspace}`) {
      return pathname === href || pathname === `/${workspace}/`;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isGlobalActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-secondary/50 border-r border-border transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo & Collapse Button */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-border">
        {!collapsed && (
          <Link href={`/${workspace}`} className="flex items-center gap-2 min-w-0" onClick={handleNavClick}>
            {branding.brandLogo ? (
              <img 
                src={branding.brandLogo} 
                alt={branding.brandName} 
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <Logo size={28} />
            )}
            <span className="font-semibold text-foreground truncate">{branding.brandName}</span>
          </Link>
        )}
        {collapsed && (
          <Link href={`/${workspace}`} className="mx-auto" onClick={handleNavClick}>
            {branding.brandLogo ? (
              <img 
                src={branding.brandLogo} 
                alt={branding.brandName} 
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <Logo size={28} />
            )}
          </Link>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Collapsed expand button */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Workspace Switcher */}
      <div className="p-2 border-b border-border">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* Voice Command Button */}
      <div className="p-2">
        <Link href={`/${workspace}/assistant`} onClick={handleNavClick}>
          <Button
            className={cn(
              "w-full h-9 bg-gradient-to-r from-[#FF5757] to-[#FF3D3D] hover:from-[#FF4040] hover:to-[#FF2020] text-white font-medium",
              collapsed && "px-0"
            )}
          >
            <Mic className="h-4 w-4" />
            {!collapsed && <span className="ml-2 text-sm">Voice Command</span>}
          </Button>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex}>
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
                    "flex items-center px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : isHighlight
                      ? "text-[#FF5757] hover:bg-background/80"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-2.5")} />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                  {!collapsed && item.badge && (
                    <span className="ml-auto text-xs bg-[#FF5757]/10 text-[#FF5757] px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Custom Modules */}
        {customModules.length > 0 && (
          <>
            <div className="my-2 mx-1 border-t border-border" />
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
                    "flex items-center px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors",
                    moduleActive
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? module.pluralName : undefined}
                >
                  <IconComponent className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-2.5")} />
                  {!collapsed && <span className="truncate">{module.pluralName}</span>}
                </Link>
              );
            })}
          </>
        )}

        {/* Divider */}
        <div className="my-2 mx-1 border-t border-border" />

        {/* Global Navigation (Reports) */}
        {GLOBAL_NAVIGATION.map((item) => {
          const active = isGlobalActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              onClick={handleNavClick}
              className={cn(
                "flex items-center px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-2.5")} />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}

        {/* Secondary Navigation (Settings, Documents) */}
        {secondaryNavigation.map((item) => {
          const active = isGlobalActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              onClick={handleNavClick}
              className={cn(
                "flex items-center px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-2.5")} />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-border p-3">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{ elements: { avatarBox: "h-8 w-8" } }}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">My Account</p>
              <p className="text-xs text-muted-foreground truncate">Free Plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
