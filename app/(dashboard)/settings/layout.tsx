"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Building, Layers, Plug, Box, Database, History } from "lucide-react";

const settingsNav = [
  {
    title: "Profile",
    href: "/settings",
    icon: User,
    description: "Manage your personal information",
  },
  {
    title: "Organization",
    href: "/settings/organization",
    icon: Building,
    description: "Manage your organization settings",
  },
  {
    title: "Integrations",
    href: "/settings/integrations",
    icon: Plug,
    description: "Connect external apps",
  },
  {
    title: "Custom Modules",
    href: "/settings/modules",
    icon: Box,
    description: "Create custom data modules",
  },
  {
    title: "Custom Fields",
    href: "/settings/custom-fields",
    icon: Layers,
    description: "Configure custom fields for modules",
  },
  {
    title: "Pipeline Stages",
    href: "/settings/pipeline",
    icon: Layers,
    description: "Configure pipeline stages",
  },
  {
    title: "Data Management",
    href: "/settings/data",
    icon: Database,
    description: "Import and export data",
  },
  {
    title: "Activity & Audit Log",
    href: "/settings/activity",
    icon: History,
    description: "View all CRM activity and changes",
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
          {settingsNav.map((item) => {
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
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
