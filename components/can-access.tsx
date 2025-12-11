"use client";

import { ReactNode } from "react";
import { usePermissions, type ActionType } from "@/hooks/use-permissions";

interface CanAccessProps {
  module: string;
  action: ActionType;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on user permissions
 * 
 * @example
 * <CanAccess module="leads" action="delete">
 *   <DeleteButton />
 * </CanAccess>
 * 
 * @example
 * <CanAccess module="leads" action="edit" fallback={<ViewOnlyBadge />}>
 *   <EditButton />
 * </CanAccess>
 */
export function CanAccess({ module, action, children, fallback = null }: CanAccessProps) {
  const { can, loading } = usePermissions();

  // While loading, don't render anything (or render fallback)
  if (loading) {
    return null;
  }

  if (can(module, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface CanAccessFieldProps {
  module: string;
  field: string;
  action: "view" | "edit";
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on field-level permissions
 * 
 * @example
 * <CanAccessField module="leads" field="revenue" action="view">
 *   <span>${lead.revenue}</span>
 * </CanAccessField>
 */
export function CanAccessField({ module, field, action, children, fallback = null }: CanAccessFieldProps) {
  const { canAccessField, loading } = usePermissions();

  if (loading) {
    return null;
  }

  if (canAccessField(module, field, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RequireRoleProps {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on user role
 * 
 * @example
 * <RequireRole roles={["Admin", "Manager"]}>
 *   <AdminPanel />
 * </RequireRole>
 */
export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const userRole = permissions?.role?.name;
  const isAdmin = permissions?.isAdmin;

  // Admins always have access
  if (isAdmin) {
    return <>{children}</>;
  }

  if (userRole && roles.includes(userRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RequireAdminProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Only render children for admin users
 * 
 * @example
 * <RequireAdmin>
 *   <DangerZone />
 * </RequireAdmin>
 */
export function RequireAdmin({ children, fallback = null }: RequireAdminProps) {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return null;
  }

  if (permissions?.isAdmin) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
