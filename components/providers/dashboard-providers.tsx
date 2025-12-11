"use client";

import { ReactNode } from "react";
import { WorkspaceProvider } from "@/lib/workspace";
import { PermissionsProvider } from "@/hooks/use-permissions";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <PermissionsProvider>
        {children}
      </PermissionsProvider>
    </WorkspaceProvider>
  );
}
