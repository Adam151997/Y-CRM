"use client";

import { ReactNode } from "react";
import { WorkspaceProvider } from "@/lib/workspace";
import { PermissionsProvider } from "@/hooks/use-permissions";
import { NotificationProvider } from "@/components/providers/notification-provider";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <PermissionsProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </PermissionsProvider>
    </WorkspaceProvider>
  );
}
