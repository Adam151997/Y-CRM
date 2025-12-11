"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";

// =============================================================================
// Types
// =============================================================================

export type ActionType = "view" | "create" | "edit" | "delete";

interface Role {
  id: string;
  name: string;
  isSystem: boolean;
}

interface ModulePermission {
  actions: ActionType[];
  fields: Record<string, string[]> | null;
}

interface PermissionsData {
  role: Role | null;
  permissions: Record<string, ModulePermission>;
  isAdmin: boolean;
}

interface PermissionsContextValue {
  permissions: PermissionsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  can: (module: string, action: ActionType) => boolean;
  canAccessField: (module: string, field: string, action: "view" | "edit") => boolean;
  getAllowedFields: (module: string, action: "view" | "edit") => string[] | null;
}

// =============================================================================
// Context
// =============================================================================

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/permissions/me");
      if (!response.ok) {
        throw new Error("Failed to fetch permissions");
      }

      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Check if user can perform action on module
  const can = useCallback(
    (module: string, action: ActionType): boolean => {
      if (!permissions) return false;
      if (permissions.isAdmin) return true;
      if (!permissions.role) return false;

      const modulePerms = permissions.permissions[module];
      if (!modulePerms) return false;

      return modulePerms.actions.includes(action);
    },
    [permissions]
  );

  // Check if user can access specific field
  const canAccessField = useCallback(
    (module: string, field: string, action: "view" | "edit"): boolean => {
      if (!permissions) return false;
      if (permissions.isAdmin) return true;

      const modulePerms = permissions.permissions[module];
      if (!modulePerms?.fields) return true; // No field restrictions

      const allowedFields = modulePerms.fields[action];
      if (!allowedFields) return true; // No restrictions for this action

      return allowedFields.includes(field);
    },
    [permissions]
  );

  // Get allowed fields for a module/action
  const getAllowedFields = useCallback(
    (module: string, action: "view" | "edit"): string[] | null => {
      if (!permissions) return null;
      if (permissions.isAdmin) return null;

      const modulePerms = permissions.permissions[module];
      if (!modulePerms?.fields) return null;

      return modulePerms.fields[action] || null;
    },
    [permissions]
  );

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        loading,
        error,
        refresh: fetchPermissions,
        can,
        canAccessField,
        getAllowedFields,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  
  if (!context) {
    // Return safe defaults if used outside provider
    return {
      permissions: null,
      loading: true,
      error: null,
      refresh: async () => {},
      can: () => false,
      canAccessField: () => false,
      getAllowedFields: () => null,
    };
  }

  return context;
}

// =============================================================================
// Standalone Hook (without provider)
// =============================================================================

export function usePermissionsStandalone() {
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/permissions/me");
      if (!response.ok) {
        throw new Error("Failed to fetch permissions");
      }

      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const can = useCallback(
    (module: string, action: ActionType): boolean => {
      if (!permissions) return false;
      if (permissions.isAdmin) return true;
      if (!permissions.role) return false;

      const modulePerms = permissions.permissions[module];
      if (!modulePerms) return false;

      return modulePerms.actions.includes(action);
    },
    [permissions]
  );

  const canAccessField = useCallback(
    (module: string, field: string, action: "view" | "edit"): boolean => {
      if (!permissions) return false;
      if (permissions.isAdmin) return true;

      const modulePerms = permissions.permissions[module];
      if (!modulePerms?.fields) return true;

      const allowedFields = modulePerms.fields[action];
      if (!allowedFields) return true;

      return allowedFields.includes(field);
    },
    [permissions]
  );

  const getAllowedFields = useCallback(
    (module: string, action: "view" | "edit"): string[] | null => {
      if (!permissions) return null;
      if (permissions.isAdmin) return null;

      const modulePerms = permissions.permissions[module];
      if (!modulePerms?.fields) return null;

      return modulePerms.fields[action] || null;
    },
    [permissions]
  );

  return {
    permissions,
    loading,
    error,
    refresh: fetchPermissions,
    can,
    canAccessField,
    getAllowedFields,
    role: permissions?.role || null,
    isAdmin: permissions?.isAdmin || false,
  };
}
