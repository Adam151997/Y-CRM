"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { usePermissions } from "@/hooks/use-permissions";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCircle,
  Target,
  CheckSquare,
  FileText,
  Settings,
  Mic,
  BarChart3,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Box,
  Package,
  Layers,
  Tag,
  Briefcase,
  Star,
  ShoppingCart,
  Truck,
  Folder,
  Award,
  LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

// Map icon names to Lucide components
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

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "AI Assistant",
    href: "/assistant",
    icon: Sparkles,
    highlight: true,
    requiresPermission: "ai_assistant",
  },
  {
    name: "Leads",
    href: "/leads",
    icon: Users,
  },
  {
    name: "Contacts",
    href: "/contacts",
    icon: UserCircle,
  },
  {
    name: "Accounts",
    href: "/accounts",
    icon: Building2,
  },
  {
    name: "Opportunities",
    href: "/opportunities",
    icon: Target,
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    name: "Pipeline",
    href: "/pipeline",
    icon: FolderKanban,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
];

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

interface Branding {
  brandName: string;
  brandLogo: string | null;
}

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { can } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [customModules, setCustomModules] = useState<CustomModule[]>([]);
  const [branding, setBranding] = useState<Branding>({ brandName: "Y CRM", brandLogo: null });

  // Check AI Assistant permission
  const hasAIAccess = can("ai_assistant", "view");

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
    const handleModuleUpdate = () => {
      fetchModules();
    };

    window.addEventListener("custom-modules-updated", handleModuleUpdate);
    return () => {
      window.removeEventListener("custom-modules-updated", handleModuleUpdate);
    };
  }, []);

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  // Filter navigation items based on permissions
  const filteredNavigation = navigation.filter((item) => {
    if ("requiresPermission" in item && item.requiresPermission === "ai_assistant") {
      return hasAIAccess;
    }
    return true;
  });

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Branding / Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0" onClick={handleNavClick}>
            {branding.brandLogo ? (
              <img 
                src={branding.brandLogo} 
                alt={branding.brandName} 
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <Logo size={28} />
            )}
            <span className="font-semibold text-lg truncate">{branding.brandName}</span>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto" onClick={handleNavClick}>
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

      {/* Voice Command Button - Only show if user has AI access */}
      {hasAIAccess && (
        <div className="p-4">
          <Link href="/assistant" onClick={handleNavClick}>
            <Button
              className={cn(
                "w-full bg-gradient-to-r from-[#FF5757] to-[#FF3D3D] hover:from-[#FF4040] hover:to-[#FF2020] text-white",
                collapsed && "px-2"
              )}
            >
              <Mic className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Voice Command</span>}
            </Button>
          </Link>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isHighlight = "highlight" in item && item.highlight;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              onClick={handleNavClick}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isHighlight
                  ? "text-[#FF5757] hover:bg-[#FF5757]/10"
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

        {/* Custom Modules Section */}
        {customModules.length > 0 && (
          <>
            <div className="my-2" />
            {customModules.map((module) => {
              const isActive = pathname.startsWith(`/modules/${module.slug}`);
              const IconComponent = iconMap[module.icon] || Box;
              
              return (
                <Link
                  key={module.id}
                  href={`/modules/${module.slug}`}
                  prefetch={true}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
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

        <div className="my-2" />

        {secondaryNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              onClick={handleNavClick}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
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
