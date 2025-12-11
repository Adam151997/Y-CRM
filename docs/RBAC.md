# Y CRM - RBAC (Role-Based Access Control) Guide

## Overview

Y CRM includes a comprehensive Role-Based Access Control system that allows organizations to manage user permissions at a granular level. The system provides both API-level and UI-level protection.

---

## Default Roles

When a new organization is created, four default roles are automatically provisioned:

| Role | Description | Permissions | Flags |
|------|-------------|-------------|-------|
| **Admin** | Full access to all features | All modules, all actions | `isSystem: true` |
| **Manager** | Full access for team leads | All modules, all actions | - |
| **Rep** | Standard team member access | All modules, view/create/edit | `isDefault: true` |
| **Read Only** | View-only access | All modules, view only | - |

---

## Permission Structure

### Modules

Permissions are organized by module. Each module represents a functional area of the CRM:

**Core Modules:**
- `leads` - Sales leads
- `contacts` - Individual contacts
- `accounts` - Company accounts
- `opportunities` - Sales deals
- `tasks` - Task management
- `documents` - File storage

**Workspace Modules:**
- `dashboard` - Dashboard access
- `pipeline` - Pipeline views
- `reports` - Analytics & reporting
- `settings` - Settings pages

**CS Modules:**
- `tickets` - Support tickets
- `health` - Health scores
- `playbooks` - CS playbooks

**Marketing Modules:**
- `campaigns` - Marketing campaigns
- `segments` - Audience segments
- `forms` - Lead capture forms

### Actions

Each module supports four standard actions:

| Action | Description |
|--------|-------------|
| `view` | Read access to list and detail pages |
| `create` | Ability to add new records |
| `edit` | Ability to modify existing records |
| `delete` | Ability to remove records |

---

## Database Schema

```sql
-- Role: Defines a permission set
Role {
  id          String    @id
  orgId       String    -- Tenant isolation
  name        String    -- "Admin", "Manager", etc.
  description String?
  isDefault   Boolean   -- Auto-assign to new members
  isSystem    Boolean   -- Can't be deleted (Admin)
}

-- Permission: Module-level permissions for a role
Permission {
  id       String   @id
  roleId   String   -- Links to Role
  module   String   -- "leads", "contacts", etc.
  actions  String[] -- ["view", "create", "edit", "delete"]
  fields   Json?    -- Field-level permissions (optional)
}

-- UserRole: Links users to roles within an organization
UserRole {
  id          String  @id
  clerkUserId String  -- Clerk user ID
  orgId       String  -- Organization scope
  roleId      String  -- Links to Role
}
```

---

## API Integration

### Permission Check Helper

Use `checkRoutePermission` in API routes to enforce permissions:

```typescript
// app/api/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { checkRoutePermission } from "@/lib/api-permissions";

export async function POST(request: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission - returns NextResponse if denied, null if allowed
  const permissionError = await checkRoutePermission(
    auth.userId,
    auth.orgId,
    "leads",    // module
    "create"    // action
  );
  if (permissionError) return permissionError;

  // Permission granted - continue with handler
  const body = await request.json();
  // ... create lead
}
```

### Alternative: Wrapper Function

```typescript
import { withPermission } from "@/lib/api-permissions";

export const DELETE = withPermission("leads", "delete", async (req, auth) => {
  // Permission already checked
  // ... delete lead
});
```

### Permission Utilities

```typescript
import { 
  checkPermission,
  getUserPermissions,
  requirePermission 
} from "@/lib/permissions";

// Check if user can perform action
const canEdit = await checkPermission(userId, orgId, "leads", "edit");

// Get all user permissions
const permissions = await getUserPermissions(userId, orgId);
// Returns: { role, permissions: Map, isAdmin: boolean }

// Throw error if not permitted
await requirePermission(userId, orgId, "leads", "delete");
```

---

## UI Integration

### CanAccess Component

Conditionally render UI based on permissions:

```tsx
import { CanAccess } from "@/components/can-access";

function LeadActions({ lead }) {
  return (
    <div>
      {/* Always visible */}
      <ViewButton />
      
      {/* Only visible with edit permission */}
      <CanAccess module="leads" action="edit">
        <EditButton />
      </CanAccess>
      
      {/* Only visible with delete permission */}
      <CanAccess module="leads" action="delete">
        <DeleteButton />
      </CanAccess>
    </div>
  );
}
```

### usePermissions Hook

Access permissions programmatically:

```tsx
import { usePermissions } from "@/hooks/use-permissions";

function LeadPage() {
  const { can, loading, permissions, isAdmin } = usePermissions();
  
  if (loading) return <Spinner />;
  
  const canEdit = can("leads", "edit");
  const canDelete = can("leads", "delete");
  
  return (
    <div>
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

### PermissionsProvider

The dashboard layout wraps all pages with `PermissionsProvider`:

```tsx
// components/providers/dashboard-providers.tsx
export function DashboardProviders({ children }) {
  return (
    <WorkspaceProvider>
      <PermissionsProvider>
        {children}
      </PermissionsProvider>
    </WorkspaceProvider>
  );
}
```

This fetches permissions from `/api/permissions/me` and provides them to all child components.

---

## Settings UI

### Team Management

**Location:** `/settings/team`

- View all team members
- Invite new members
- Change user roles
- Remove team members

### Role Management

**Location:** `/settings/roles`

- View all roles with user counts
- Create new custom roles
- Edit role permissions
- Delete custom roles (not system roles)

### Role Editor

**Location:** `/settings/roles/[id]`

- Edit role name and description
- Set as default role
- Configure module permissions via grid
- Bulk grant/revoke all permissions

---

## Auto-Assignment

### New Organizations

When a new organization is created (via Clerk):

1. Four default roles are created automatically
2. Organization creator is assigned the **Admin** role

### New Team Members

When a new user joins an organization:

1. Check if user has a role
2. If not, check if roles exist for org (create if needed)
3. Assign the default role (**Rep**) to the user

This is handled in `lib/auth.ts` → `ensureOrganization()` and `ensureUserHasRole()`.

---

## API Endpoints

### Roles API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/roles` | GET | List all roles |
| `/api/roles` | POST | Create new role |
| `/api/roles/[id]` | GET | Get role details |
| `/api/roles/[id]` | PUT | Update role |
| `/api/roles/[id]` | DELETE | Delete role |

### Team API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/team` | GET | List team members |
| `/api/team/invite` | POST | Invite new member |
| `/api/team/[userId]` | PUT | Update member role |
| `/api/team/[userId]` | DELETE | Remove member |

### Permissions API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/permissions/me` | GET | Get current user's permissions |

---

## Best Practices

### 1. Always Check Permissions in API Routes

Even if UI hides buttons, always validate on the server:

```typescript
const error = await checkRoutePermission(userId, orgId, "leads", "delete");
if (error) return error;
```

### 2. Use CanAccess for UI Elements

Don't manually check permissions in JSX:

```tsx
// ❌ Bad
{permissions.leads?.includes("edit") && <EditButton />}

// ✅ Good
<CanAccess module="leads" action="edit">
  <EditButton />
</CanAccess>
```

### 3. Handle Loading States

```tsx
const { can, loading } = usePermissions();

if (loading) return <Skeleton />;
```

### 4. Cache Permissions

Permissions are cached for 5 minutes in Redis. The client also caches via React Query.

### 5. Audit Permission-Sensitive Actions

```typescript
await createAuditLog({
  orgId,
  action: "DELETE",
  module: "LEAD",
  recordId: leadId,
  actorId: userId,
  actorType: "USER",
});
```

---

## Extending RBAC

### Adding a New Module

1. **Add permission checks to API routes:**
```typescript
const error = await checkRoutePermission(userId, orgId, "new-module", "view");
```

2. **Add UI permission gates:**
```tsx
<CanAccess module="new-module" action="create">
  <CreateButton />
</CanAccess>
```

3. **Update role editor** to include the new module in the permissions grid.

### Field-Level Permissions (Advanced)

The schema supports field-level permissions:

```typescript
// In Permission.fields
{
  "view": ["name", "email", "status"],
  "edit": ["status"]
}
```

Use `canAccessField()` and `filterToAllowedFields()` from `lib/permissions.ts`.

---

## Troubleshooting

### "You don't have permission" Error

1. Check `/api/debug/auth` to see what the API receives
2. Verify UserRole exists in Prisma Studio
3. Check that orgId matches between UserRole and auth context

### Permissions Not Loading

1. Check browser console for API errors
2. Verify `/api/permissions/me` returns data
3. Ensure `PermissionsProvider` wraps your components

### New User Has No Role

1. Check `ensureUserHasRole()` is being called
2. Verify default role exists (`isDefault: true`)
3. Check for errors in server logs
