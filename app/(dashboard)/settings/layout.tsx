"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Building, Layers, Plug, Box, Database, History, Palette, Users, Shield, Lock } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useEffect } from "react";

const settingsNav = [
  {
    title: "Profile",
    href: "/settings",
    icon: User,
    description: "Manage your personal information",
    requiresSettingsPermission: false, // Profile is accessible to everyone
  },
  {
    title: "Organization",
    href: "/settings/organization",
    icon: Building,
    description: "Manage your organization settings",
    requiresSettingsPermission: true,
  },
  {
    title: "Branding",
    href: "/settings/branding",
    icon: Palette,
    description: "Customize your CRM appearance",
    requiresSettingsPermission: true,
  },
  {
    title: "Team",
    href: "/settings/team",
    icon: Users,
    description: "Manage team members",
    requiresSettingsPermission: true,
  },
  {
    title: "Roles & Permissions",
    href: "/settings/roles",
    icon: Shield,
    description: "Configure access control",
    requiresSettingsPermission: true,
  },
  {
    title: "Integrations",
    href: "/settings/integrations",
    icon: Plug,
    description: "Connect external apps & manage API keys",
    requiresSettingsPermission: true,
  },
  {
    title: "Custom Modules",
    href: "/settings/modules",
    icon: Box,
    description: "Create custom data modules",
    requiresSettingsPermission: true,
  },
  {
    title: "Custom Fields",
    href: "/settings/custom-fields",
    icon: Layers,
    description: "Configure custom fields for modules",
    requiresSettingsPermission: true,
  },
  {
    title: "Pipeline Stages",
    href: "/settings/pipeline",
    icon: Layers,
    description: "Configure pipeline stages",
    requiresSettingsPermission: true,
  },
  {
    title: "Data Management",
    href: "/settings/data",
    icon: Database,
    description: "Import and export data",
    requiresSettingsPermission: true,
  },
  {
    title: "Audit Log",
    href: "/settings/activity",
    icon: History,
    description: "View all CRM changes",
    requiresSettingsPermission: true,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, loading } = usePermissions();

  const hasSettingsAccess = can("settings", "view");

  // Redirect non-admin users trying to access protected settings pages
  useEffect(() => {
    if (loading) return;

    // Find current nav item
    const currentItem = settingsNav.find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/settings" && pathname.startsWith(item.href))
    );

    // If current page requires settings permission and user doesn't have it
    if (currentItem?.requiresSettingsPermission && !hasSettingsAccess) {
      router.replace("/settings");
    }
  }, [pathname, hasSettingsAccess, loading, router]);

  // Filter navigation items based on permissions
  const visibleNavItems = settingsNav.filter((item) => {
    if (!item.requiresSettingsPermission) return true;
    return hasSettingsAccess;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and organization preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/settings" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <div>
                  <p className="font-medium">{item.title}</p>
                </div>
              </Link>
            );
          })}

          {/* Show restricted access indicator for non-admin users */}
          {!hasSettingsAccess && !loading && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Admin access required</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Contact your administrator for access to organization settings.
              </p>
            </div>
          )}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
