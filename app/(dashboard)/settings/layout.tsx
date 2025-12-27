"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { User, Building, Layers, Plug, Box, Database, History, Palette, Users, Shield, Lock, Globe, LucideIcon } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useEffect } from "react";

interface SettingsNavItem {
  titleKey: string;
  href: string;
  icon: LucideIcon;
  requiresSettingsPermission: boolean;
}

const settingsNavItems: SettingsNavItem[] = [
  {
    titleKey: "profile.title",
    href: "/settings",
    icon: User,
    requiresSettingsPermission: false,
  },
  {
    titleKey: "organization.title",
    href: "/settings/organization",
    icon: Building,
    requiresSettingsPermission: true,
  },
  {
    titleKey: "branding.title",
    href: "/settings/branding",
    icon: Palette,
    requiresSettingsPermission: true,
  },
  {
    titleKey: "team.title",
    href: "/settings/team",
    icon: Users,
    requiresSettingsPermission: true,
  },
  {
    titleKey: "roles.title",
    href: "/settings/roles",
    icon: Shield,
    requiresSettingsPermission: true,
  },
  {
    titleKey: "integrations.title",
    href: "/settings/integrations",
    icon: Plug,
    requiresSettingsPermission: true,
  },
  {
    titleKey: "modules.title",
    href: "/settings/modules",
    icon: Box,
    requiresSettingsPermission: true,
  },
  {
    titleKey: "customFields.title",
    href: "/settings/custom-fields",
    icon: Layers,
    requiresSettingsPermission: true,
  },
  {
    titleKey: "pipeline.title",
    href: "/settings/pipeline",
    icon: Layers,
    requiresSettingsPermission: true,
  },
  {
    titleKey: "data.title",
    href: "/settings/data",
    icon: Database,
    requiresSettingsPermission: true,
  },
  {
    titleKey: "language.title",
    href: "/settings/languages",
    icon: Globe,
    requiresSettingsPermission: false,
  },
  {
    titleKey: "activity.title",
    href: "/settings/activity",
    icon: History,
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
  const t = useTranslations("settings");

  const hasSettingsAccess = can("settings", "view");

  // Redirect non-admin users trying to access protected settings pages
  useEffect(() => {
    if (loading) return;

    // Find current nav item
    const currentItem = settingsNavItems.find(
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
  const visibleNavItems = settingsNavItems.filter((item) => {
    if (!item.requiresSettingsPermission) return true;
    return hasSettingsAccess;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">
          {t("subtitle")}
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
                  <p className="font-medium">{t(item.titleKey)}</p>
                </div>
              </Link>
            );
          })}

          {/* Show restricted access indicator for non-admin users */}
          {!hasSettingsAccess && !loading && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm">{t("adminRequired")}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("contactAdmin")}
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
