"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
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
    color: "#ef4444",
    bgColor: "bg-red-500",
    textColor: "text-red-600",
    description: "Manage leads, opportunities, and close deals",
  },
  cs: {
    key: "cs",
    name: "Customer Success",
    shortName: "CS",
    color: "#3b82f6",
    bgColor: "bg-blue-500",
    textColor: "text-blue-600",
    description: "Support tickets, health scores, and retention",
  },
  marketing: {
    key: "marketing",
    name: "Marketing Hub",
    shortName: "Marketing",
    color: "#f97316",
    bgColor: "bg-orange-500",
    textColor: "text-orange-600",
    description: "Campaigns, segments, and lead generation",
  },
};

// Global routes that should preserve current workspace
const GLOBAL_ROUTES = ["/settings", "/reports", "/documents", "/modules"];

// Storage key for persisting workspace
const WORKSPACE_STORAGE_KEY = "y-crm-workspace";

// Context interface
interface WorkspaceContextValue {
  workspace: WorkspaceType;
  config: WorkspaceConfig;
  setWorkspace: (workspace: WorkspaceType) => void;
  isGlobalRoute: boolean;
}

// Create context
const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

// Helper to detect if current path is a global route
export function isGlobalRoutePath(pathname: string): boolean {
  return GLOBAL_ROUTES.some(route => pathname.startsWith(route));
}

// Helper to detect workspace from pathname
export function detectWorkspaceFromPath(pathname: string): WorkspaceType | null {
  if (pathname.startsWith("/cs")) return "cs";
  if (pathname.startsWith("/marketing")) return "marketing";
  if (pathname.startsWith("/sales")) return "sales";
  return null;
}

// Get stored workspace from localStorage
function getStoredWorkspace(): WorkspaceType | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (stored && (stored === "sales" || stored === "cs" || stored === "marketing")) {
      return stored as WorkspaceType;
    }
  } catch {
    // localStorage might not be available
  }
  return null;
}

// Store workspace in localStorage
function storeWorkspace(workspace: WorkspaceType): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace);
  } catch {
    // localStorage might not be available
  }
}

// Provider component
interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const pathname = usePathname();
  const [storedWorkspace, setStoredWorkspace] = useState<WorkspaceType>("sales");
  
  const isGlobalRoute = isGlobalRoutePath(pathname);
  const pathWorkspace = detectWorkspaceFromPath(pathname);
  
  useEffect(() => {
    const stored = getStoredWorkspace();
    if (stored) {
      setStoredWorkspace(stored);
    }
  }, []);
  
  const workspace: WorkspaceType = pathWorkspace || storedWorkspace;
  const config = WORKSPACES[workspace];

  useEffect(() => {
    if (pathWorkspace) {
      storeWorkspace(pathWorkspace);
      setStoredWorkspace(pathWorkspace);
    }
  }, [pathWorkspace]);

  const setWorkspace = (newWorkspace: WorkspaceType) => {
    storeWorkspace(newWorkspace);
    setStoredWorkspace(newWorkspace);
    if (typeof window !== "undefined") {
      window.location.href = `/${newWorkspace}`;
    }
  };

  return (
    <WorkspaceContext.Provider value={{ workspace, config, setWorkspace, isGlobalRoute }}>
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
      isGlobalRoute: false,
    };
  }
  return context;
}
