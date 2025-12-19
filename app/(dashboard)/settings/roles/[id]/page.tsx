"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Shield, 
  Loader2, 
  Save, 
  Lock,
  Users,
  Building,
  Target,
  CheckSquare,
  FileText,
  LayoutGrid,
  Ticket,
  Heart,
  BookOpen,
  Megaphone,
  Layers,
  Box,
  Eye,
  EyeOff,
} from "lucide-react";

// Built-in modules with icons
const BUILT_IN_MODULES = [
  { slug: "leads", name: "Leads", icon: Users, hasOwnership: true },
  { slug: "contacts", name: "Contacts", icon: Users, hasOwnership: true },
  { slug: "accounts", name: "Accounts", icon: Building, hasOwnership: true },
  { slug: "opportunities", name: "Opportunities", icon: Target, hasOwnership: true },
  { slug: "tasks", name: "Tasks", icon: CheckSquare, hasOwnership: true },
  { slug: "invoices", name: "Invoices", icon: FileText, hasOwnership: false },
  { slug: "documents", name: "Documents", icon: FileText, hasOwnership: false },
  { slug: "dashboard", name: "Dashboard", icon: LayoutGrid, hasOwnership: false },
  { slug: "pipeline", name: "Pipeline", icon: Layers, hasOwnership: false },
  { slug: "reports", name: "Reports", icon: FileText, hasOwnership: false },
  { slug: "tickets", name: "Tickets", icon: Ticket, hasOwnership: true },
  { slug: "health", name: "Health Scores", icon: Heart, hasOwnership: false },
  { slug: "playbooks", name: "Playbooks", icon: BookOpen, hasOwnership: false },
  { slug: "campaigns", name: "Campaigns", icon: Megaphone, hasOwnership: false },
  { slug: "segments", name: "Segments", icon: Users, hasOwnership: false },
  { slug: "forms", name: "Forms", icon: FileText, hasOwnership: false },
  { slug: "settings", name: "Settings", icon: Shield, hasOwnership: false },
];

const ACTIONS = ["view", "create", "edit", "delete"] as const;

const VISIBILITY_OPTIONS = [
  { value: "ALL", label: "All Records", description: "See all records" },
  { value: "OWN_ONLY", label: "Own Only", description: "Only assigned records" },
  { value: "UNASSIGNED", label: "Own + Unassigned", description: "Own and unassigned" },
];

interface Permission {
  id?: string;
  module: string;
  actions: string[];
  fields?: Record<string, string[]> | null;
  recordVisibility?: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isSystem: boolean;
  userCount: number;
  permissions: Permission[];
}

interface CustomModule {
  id: string;
  slug: string;
  name: string;
}

interface ModulePermission {
  actions: Set<string>;
  recordVisibility: string;
}

export default function RoleEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [customModules, setCustomModules] = useState<CustomModule[]>([]);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [permissions, setPermissions] = useState<Map<string, ModulePermission>>(new Map());

  // Fetch role and custom modules
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roleRes, modulesRes] = await Promise.all([
          fetch(`/api/roles/${id}`),
          fetch("/api/custom-modules"),
        ]);

        if (!roleRes.ok) {
          toast.error("Role not found");
          router.push("/settings/roles");
          return;
        }

        const roleData = await roleRes.json();
        setRole(roleData.role);
        setName(roleData.role.name);
        setDescription(roleData.role.description || "");
        setIsDefault(roleData.role.isDefault);

        // Build permissions map with recordVisibility
        const permMap = new Map<string, ModulePermission>();
        roleData.role.permissions.forEach((p: Permission) => {
          permMap.set(p.module, {
            actions: new Set(p.actions),
            recordVisibility: p.recordVisibility || "ALL",
          });
        });
        setPermissions(permMap);

        if (modulesRes.ok) {
          const modulesData = await modulesRes.json();
          setCustomModules(modulesData.modules || []);
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        toast.error("Failed to load role");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  // Get or create module permission
  const getModulePermission = (module: string): ModulePermission => {
    return permissions.get(module) || { actions: new Set(), recordVisibility: "ALL" };
  };

  // Toggle action for a module
  const toggleAction = (module: string, action: string) => {
    setPermissions((prev) => {
      const newMap = new Map(prev);
      const current = getModulePermission(module);
      const actions = new Set(current.actions);
      
      if (actions.has(action)) {
        actions.delete(action);
      } else {
        actions.add(action);
      }
      
      if (actions.size === 0) {
        newMap.delete(module);
      } else {
        newMap.set(module, { ...current, actions });
      }
      
      return newMap;
    });
  };

  // Toggle all actions for a module
  const toggleAllActions = (module: string, enabled: boolean) => {
    setPermissions((prev) => {
      const newMap = new Map(prev);
      const current = getModulePermission(module);
      
      if (enabled) {
        newMap.set(module, { ...current, actions: new Set(ACTIONS) });
      } else {
        newMap.delete(module);
      }
      
      return newMap;
    });
  };

  // Set record visibility for a module
  const setRecordVisibility = (module: string, visibility: string) => {
    setPermissions((prev) => {
      const newMap = new Map(prev);
      const current = getModulePermission(module);
      
      // Only set if module has any actions
      if (current.actions.size > 0) {
        newMap.set(module, { ...current, recordVisibility: visibility });
      }
      
      return newMap;
    });
  };

  // Check if module has all actions
  const hasAllActions = (module: string) => {
    const perm = permissions.get(module);
    return perm?.actions.size === ACTIONS.length;
  };

  // Save role
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }

    setSaving(true);
    try {
      // Convert permissions map to array
      const permissionsArray = Array.from(permissions.entries()).map(([module, perm]) => ({
        module,
        actions: Array.from(perm.actions),
        recordVisibility: perm.recordVisibility,
      }));

      const response = await fetch(`/api/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isDefault,
          permissions: permissionsArray,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save role");
      }

      toast.success("Role saved successfully");
      router.push("/settings/roles");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  // Grant all permissions
  const grantAll = () => {
    const allModules = [...BUILT_IN_MODULES.map(m => m.slug), ...customModules.map(m => m.slug)];
    const newMap = new Map<string, ModulePermission>();
    allModules.forEach(module => {
      newMap.set(module, { actions: new Set(ACTIONS), recordVisibility: "ALL" });
    });
    setPermissions(newMap);
  };

  // Revoke all permissions
  const revokeAll = () => {
    setPermissions(new Map());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!role) {
    return null;
  }

  const allModules = [
    ...BUILT_IN_MODULES,
    ...customModules.map(m => ({ slug: m.slug, name: m.name, icon: Box, hasOwnership: true })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/roles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Edit Role
            {role.isSystem && <Lock className="h-4 w-4 text-muted-foreground" />}
          </h2>
          <p className="text-muted-foreground">
            Configure permissions for {role.name}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Role name and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={role.isSystem}
                placeholder="e.g., Sales Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this role is for..."
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="default">Default Role</Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign this role to new team members
              </p>
            </div>
            <Switch
              id="default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>

          {role.userCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{role.userCount} {role.userCount === 1 ? "user" : "users"} assigned to this role</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Module Permissions</CardTitle>
            <CardDescription>
              Control what users with this role can access and which records they can see
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={grantAll}>
              Grant All
            </Button>
            <Button variant="outline" size="sm" onClick={revokeAll}>
              Revoke All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Header */}
          <div className="grid grid-cols-[1fr,repeat(4,60px),60px,140px] gap-2 pb-3 border-b text-sm font-medium text-muted-foreground">
            <div>Module</div>
            {ACTIONS.map((action) => (
              <div key={action} className="text-center capitalize text-xs">{action}</div>
            ))}
            <div className="text-center text-xs">All</div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Eye className="h-3 w-3" />
                <span className="text-xs">Visibility</span>
              </div>
            </div>
          </div>

          {/* Module rows */}
          <div className="divide-y">
            {allModules.map((module) => {
              const Icon = module.icon;
              const perm = permissions.get(module.slug);
              const modulePerms = perm?.actions || new Set();
              const hasActions = modulePerms.size > 0;
              
              return (
                <div
                  key={module.slug}
                  className="grid grid-cols-[1fr,repeat(4,60px),60px,140px] gap-2 py-3 items-center"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{module.name}</span>
                    {!BUILT_IN_MODULES.find(m => m.slug === module.slug) && (
                      <Badge variant="outline" className="text-xs">Custom</Badge>
                    )}
                  </div>
                  
                  {ACTIONS.map((action) => (
                    <div key={action} className="flex justify-center">
                      <Checkbox
                        checked={modulePerms.has(action)}
                        onCheckedChange={() => toggleAction(module.slug, action)}
                      />
                    </div>
                  ))}
                  
                  <div className="flex justify-center">
                    <Checkbox
                      checked={hasAllActions(module.slug)}
                      onCheckedChange={(checked) => toggleAllActions(module.slug, !!checked)}
                    />
                  </div>

                  {/* Record Visibility */}
                  <div className="flex justify-center">
                    {module.hasOwnership && hasActions ? (
                      <Select
                        value={perm?.recordVisibility || "ALL"}
                        onValueChange={(value) => setRecordVisibility(module.slug, value)}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VISIBILITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex flex-col">
                                <span>{opt.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {allModules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No modules available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Visibility Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Record Visibility Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {VISIBILITY_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className={`p-2 rounded-md ${
                  opt.value === "ALL" ? "bg-green-500/10 text-green-500" :
                  opt.value === "OWN_ONLY" ? "bg-orange-500/10 text-orange-500" :
                  "bg-blue-500/10 text-blue-500"
                }`}>
                  {opt.value === "ALL" ? <Eye className="h-4 w-4" /> :
                   opt.value === "OWN_ONLY" ? <EyeOff className="h-4 w-4" /> :
                   <Users className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permission Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Summary</CardTitle>
          <CardDescription>Quick overview of granted permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array.from(permissions.entries()).map(([module, perm]) => (
              <Badge key={module} variant="secondary" className="gap-1">
                {allModules.find(m => m.slug === module)?.name || module}
                <span className="text-muted-foreground">
                  ({Array.from(perm.actions).join(", ")})
                </span>
                {perm.recordVisibility !== "ALL" && (
                  <span className="text-orange-500 ml-1">
                    [{perm.recordVisibility === "OWN_ONLY" ? "Own" : "Own+Unassigned"}]
                  </span>
                )}
              </Badge>
            ))}
            {permissions.size === 0 && (
              <span className="text-sm text-muted-foreground">No permissions granted</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
