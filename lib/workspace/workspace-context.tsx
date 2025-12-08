"use client";

import { createContext, useContext, ReactNode } from "react";
import { usePathname } from "next/navigation";

// Workspace types
export type WorkspaceType = "sales" | "cs" | "marketing";

export interface WorkspaceConfig {
  key: WorkspaceType;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

// Workspace configurations
export const WORKSPACES: Record<WorkspaceType, WorkspaceConfig> = {
  sales: {
    key: "sales",
    name: "Sales CRM",
    shortName: "Sales",
    color: "#ef4444", // red-500
    bgColor: "bg-red-500",
    textColor: "text-red-600",
    description: "Manage leads, opportunities, and close deals",
  },
  cs: {
    key: "cs",
    name: "Customer Success",
    shortName: "CS",
    color: "#3b82f6", // blue-500
    bgColor: "bg-blue-500",
    textColor: "text-blue-600",
    description: "Support tickets, health scores, and retention",
  },
  marketing: {
    key: "marketing",
    name: "Marketing Hub",
    shortName: "Marketing",
    color: "#f97316", // orange-500
    bgColor: "bg-orange-500",
    textColor: "text-orange-600",
    description: "Campaigns, segments, and lead generation",
  },
};

// Context interface
interface WorkspaceContextValue {
  workspace: WorkspaceType;
  config: WorkspaceConfig;
  setWorkspace: (workspace: WorkspaceType) => void;
}

// Create context
const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

// Helper to detect workspace from pathname
export function detectWorkspaceFromPath(pathname: string): WorkspaceType {
  if (pathname.startsWith("/cs")) return "cs";
  if (pathname.startsWith("/marketing")) return "marketing";
  // Default to sales for /sales, /dashboard, /leads, etc.
  return "sales";
}

// Provider component
interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const pathname = usePathname();
  const workspace = detectWorkspaceFromPath(pathname);
  const config = WORKSPACES[workspace];

  const setWorkspace = (newWorkspace: WorkspaceType) => {
    // Navigation will be handled by the switcher component
    // This is just for programmatic workspace changes
    if (typeof window !== "undefined") {
      window.location.href = `/${newWorkspace}`;
    }
  };

  return (
    <WorkspaceContext.Provider value={{ workspace, config, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// Hook to use workspace context
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

// Hook that's safe to use outside provider (returns defaults)
export function useWorkspaceSafe() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    return {
      workspace: "sales" as WorkspaceType,
      config: WORKSPACES.sales,
      setWorkspace: () => {},
    };
  }
  return context;
}

// Route mapping for workspace-aware links
const WORKSPACE_ROUTES: Record<WorkspaceType, Record<string, string>> = {
  sales: {
    leads: "/sales/leads",
    contacts: "/sales/contacts",
    accounts: "/sales/accounts",
    opportunities: "/sales/opportunities",
    pipeline: "/sales/pipeline",
    tasks: "/sales/tasks",
    reports: "/sales/reports",
    assistant: "/sales/assistant",
  },
  cs: {
    tickets: "/cs/tickets",
    health: "/cs/health",
    accounts: "/cs/accounts",
    playbooks: "/cs/playbooks",
    renewals: "/cs/renewals",
    tasks: "/cs/tasks",
    assistant: "/cs/assistant",
  },
  marketing: {
    campaigns: "/marketing/campaigns",
    segments: "/marketing/segments",
    forms: "/marketing/forms",
    assets: "/marketing/assets",
    assistant: "/marketing/assistant",
  },
};

// Hook to get workspace-aware links
export function useWorkspaceLinks() {
  const { workspace } = useWorkspaceSafe();
  const routes = WORKSPACE_ROUTES[workspace];

  return {
    // Get full path for a module
    getPath: (module: string, subPath?: string) => {
      const basePath = routes[module] || `/${workspace}/${module}`;
      return subPath ? `${basePath}${subPath}` : basePath;
    },
    // Get base path for current workspace
    basePath: `/${workspace}`,
    // Direct route accessors
    routes,
  };
}
