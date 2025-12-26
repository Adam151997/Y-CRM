"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import {
  ChevronLeft,
  ChevronRight,
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
import { useState, useEffect, useMemo } from "react";
import { Logo } from "@/components/ui/logo";
import { usePermissions } from "@/hooks/use-permissions";
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
  const { workspace } = useWorkspace();
  const { can, loading: permissionsLoading, isAdmin } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [customModules, setCustomModules] = useState<CustomModule[]>([]);
  const [branding, setBranding] = useState<Branding>({ brandName: "Y CRM", brandLogo: null });

  const navigation = getWorkspaceNavigation(workspace);

  // Filter navigation items based on permissions
  const filteredNavigation = useMemo(() => {
    // While loading, show all items to avoid flash
    if (permissionsLoading) return navigation;

    return navigation.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // If no permission required, always show
        if (!item.requiresPermission) return true;
        // Check if user has view permission for the module
        return can(item.requiresPermission, "view");
      })
    }));
  }, [navigation, can, permissionsLoading]);

  // Filter global navigation items based on permissions
  const filteredGlobalNavigation = useMemo(() => {
    if (permissionsLoading) return GLOBAL_NAVIGATION;

    return GLOBAL_NAVIGATION.filter(item => {
      if (!item.requiresPermission) return true;
      return can(item.requiresPermission, "view");
    });
  }, [can, permissionsLoading]);

  // Check if user can access documents
  const canAccessDocuments = useMemo(() => {
    if (permissionsLoading) return true;
    return can("documents", "view");
  }, [can, permissionsLoading]);

  // Check if user can access settings (based on permissions panel)
  const canAccessSettings = useMemo(() => {
    if (permissionsLoading) return true;
    return can("settings", "view");
  }, [can, permissionsLoading]);

  // Filter custom modules based on permissions
  const filteredCustomModules = useMemo(() => {
    if (permissionsLoading) return customModules;

    return customModules.filter((module) => can(module.slug, "view"));
  }, [customModules, can, permissionsLoading]);

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

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {filteredNavigation.map((section, sectionIndex) => (
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
        {filteredCustomModules.length > 0 && (
          <>
            <div className="my-2 mx-1 border-t border-border" />
            {filteredCustomModules.map((module) => {
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
        {filteredGlobalNavigation.map((item) => {
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

        {/* Documents */}
        {canAccessDocuments && (
          <Link
            href="/documents"
            prefetch={true}
            onClick={handleNavClick}
            className={cn(
              "flex items-center px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors",
              isGlobalActive("/documents")
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Documents" : undefined}
          >
            <FileText className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-2.5")} />
            {!collapsed && <span className="truncate">Documents</span>}
          </Link>
        )}
      </nav>

      {/* Bottom Section - Settings & User */}
      <div className="border-t border-border">
        {/* Settings Link - Admin only */}
        {canAccessSettings && (
          <div className="px-2 py-2">
            <Link
              href="/settings"
              prefetch={true}
              onClick={handleNavClick}
              className={cn(
                "flex items-center px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors",
                isGlobalActive("/settings")
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? "Settings" : undefined}
            >
              <Settings className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-2.5")} />
              {!collapsed && <span className="truncate">Settings</span>}
            </Link>
          </div>
        )}

        {/* User Section */}
        <div className="p-3 border-t border-border">
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
    </div>
  );
}
