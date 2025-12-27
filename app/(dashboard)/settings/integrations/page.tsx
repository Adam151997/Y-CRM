"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Trash2,
  Wrench,
  Key,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Clock,
  AlertTriangle,
  Webhook,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Settings,
  Pencil,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { WEBHOOK_EVENTS } from "@/lib/integrations";

interface Integration {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isEnabled: boolean;
  events: string[];
  lastTriggeredAt: string | null;
  successCount: number;
  failureCount: number;
  createdAt: string;
  createdBy?: {
    firstName: string | null;
    lastName: string | null;
  };
}

interface APIKey {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  revokedAt: string | null;
  key?: string;
}

// Built-in AI tools organized by category
const BUILTIN_TOOLS = {
  sales: [
    { name: "create_lead", description: "Create a new lead in the CRM" },
    { name: "search_leads", description: "Search and filter leads" },
    { name: "update_lead", description: "Update lead information" },
    { name: "convert_lead", description: "Convert lead to contact/account" },
    { name: "create_contact", description: "Create a new contact" },
    { name: "search_contacts", description: "Search and filter contacts" },
    { name: "update_contact", description: "Update contact information" },
    { name: "create_account", description: "Create a new account" },
    { name: "search_accounts", description: "Search and filter accounts" },
    { name: "update_account", description: "Update account information" },
    { name: "create_opportunity", description: "Create a sales opportunity" },
    { name: "search_opportunities", description: "Search opportunities" },
    { name: "update_opportunity", description: "Update opportunity details" },
    { name: "create_invoice", description: "Create a new invoice" },
    { name: "search_invoices", description: "Search invoices" },
    { name: "search_inventory", description: "Search inventory items" },
    { name: "update_inventory", description: "Update stock levels" },
  ],
  customerSuccess: [
    { name: "create_ticket", description: "Create support ticket" },
    { name: "search_tickets", description: "Search tickets" },
    { name: "update_ticket", description: "Update ticket status" },
    { name: "add_ticket_message", description: "Add message to ticket" },
    { name: "get_health_score", description: "Get account health score" },
    { name: "update_health_score", description: "Update health metrics" },
    { name: "search_at_risk_accounts", description: "Find at-risk accounts" },
    { name: "search_playbooks", description: "Search CS playbooks" },
    { name: "run_playbook", description: "Execute a playbook" },
    { name: "create_renewal", description: "Create renewal record" },
    { name: "search_renewals", description: "Search renewals" },
    { name: "update_renewal", description: "Update renewal status" },
    { name: "get_upcoming_renewals", description: "Get upcoming renewals" },
  ],
  marketing: [
    { name: "create_campaign", description: "Create marketing campaign" },
    { name: "search_campaigns", description: "Search campaigns" },
    { name: "update_campaign", description: "Update campaign details" },
    { name: "create_segment", description: "Create audience segment" },
    { name: "search_segments", description: "Search segments" },
    { name: "create_form", description: "Create lead capture form" },
    { name: "search_forms", description: "Search forms" },
  ],
  hr: [
    { name: "create_employee", description: "Create employee record" },
    { name: "search_employees", description: "Search employees" },
    { name: "update_employee", description: "Update employee info" },
    { name: "create_leave_request", description: "Submit leave request" },
    { name: "search_leaves", description: "Search leave records" },
    { name: "approve_leave", description: "Approve/reject leave" },
    { name: "search_payroll", description: "Search payroll records" },
  ],
  shared: [
    { name: "create_task", description: "Create a task" },
    { name: "complete_task", description: "Mark task complete" },
    { name: "search_tasks", description: "Search tasks" },
    { name: "create_note", description: "Add note to record" },
    { name: "search_notes", description: "Search notes" },
    { name: "log_activity", description: "Log an activity" },
    { name: "search_activities", description: "Search activities" },
    { name: "get_dashboard_stats", description: "Get CRM statistics" },
    { name: "search_documents", description: "Search documents" },
    { name: "create_report", description: "Generate CRM reports" },
    { name: "semantic_search", description: "AI-powered search across all data" },
    { name: "export_data", description: "Export data to CSV/JSON" },
  ],
  customModules: [
    { name: "list_custom_modules", description: "List custom modules" },
    { name: "create_custom_module", description: "Create custom module" },
    { name: "create_custom_field", description: "Add custom field" },
    { name: "create_custom_record", description: "Create module record" },
    { name: "search_custom_records", description: "Search module records" },
    { name: "update_custom_record", description: "Update module record" },
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  sales: "Sales",
  customerSuccess: "Customer Success",
  marketing: "Marketing",
  hr: "Human Resources",
  shared: "Shared",
  customModules: "Custom Modules",
};

const SCOPE_OPTIONS = [
  { value: "mcp:read", label: "Read", description: "Read CRM data via MCP tools" },
  { value: "mcp:write", label: "Write", description: "Create and update records" },
  { value: "mcp:admin", label: "Admin", description: "Full access including destructive operations" },
];

function IntegrationsContent() {
  const searchParams = useSearchParams();

  // Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null);
  const [showKeyValue, setShowKeyValue] = useState(false);

  // Integration form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "webhook_outgoing",
    url: "",
    headers: "",
    authType: "none",
    apiKey: "",
    bearerToken: "",
    headerName: "X-API-Key",
    username: "",
    password: "",
    events: [] as string[],
  });

  // API Key form state
  const [keyFormData, setKeyFormData] = useState({
    name: "",
    description: "",
    scopes: ["mcp:read", "mcp:write"] as string[],
    expiresAt: "",
  });

  // Load integrations
  const loadIntegrations = async () => {
    try {
      const response = await fetch("/api/integrations");
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error("Failed to load integrations:", error);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  // Load API keys
  const loadAPIKeys = async () => {
    try {
      const response = await fetch("/api/api-keys");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
    loadAPIKeys();
  }, []);

  // Handle URL params (success/error messages)
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      toast.success(success);
      window.history.replaceState({}, "", "/settings/integrations");
    }
    if (error) {
      toast.error(error);
      window.history.replaceState({}, "", "/settings/integrations");
    }
  }, [searchParams]);

  // Integration handlers
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "webhook_outgoing",
      url: "",
      headers: "",
      authType: "none",
      apiKey: "",
      bearerToken: "",
      headerName: "X-API-Key",
      username: "",
      password: "",
      events: [],
    });
    setEditingIntegration(null);
  };

  const handleAddIntegration = async () => {
    try {
      // Parse headers JSON if provided
      let headers: Record<string, string> = {};
      if (formData.headers.trim()) {
        try {
          headers = JSON.parse(formData.headers);
        } catch {
          toast.error("Invalid JSON for headers");
          return;
        }
      }

      // Build auth config
      let authConfig: Record<string, string> | undefined;
      if (formData.authType !== "none") {
        authConfig = {};
        switch (formData.authType) {
          case "api_key":
            authConfig.apiKey = formData.apiKey;
            authConfig.headerName = formData.headerName;
            break;
          case "bearer":
            authConfig.bearerToken = formData.bearerToken;
            break;
          case "basic":
            authConfig.username = formData.username;
            authConfig.password = formData.password;
            break;
        }
      }

      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        url: formData.url,
        headers,
        authType: formData.authType,
        authConfig,
        events: formData.events,
      };

      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Integration created");
        setShowAddDialog(false);
        resetForm();
        loadIntegrations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create integration");
      }
    } catch (error) {
      toast.error("Failed to create integration");
    }
  };

  const handleUpdateIntegration = async () => {
    if (!editingIntegration) return;

    try {
      let headers: Record<string, string> = {};
      if (formData.headers.trim()) {
        try {
          headers = JSON.parse(formData.headers);
        } catch {
          toast.error("Invalid JSON for headers");
          return;
        }
      }

      let authConfig: Record<string, string> | undefined;
      if (formData.authType !== "none") {
        authConfig = {};
        switch (formData.authType) {
          case "api_key":
            authConfig.apiKey = formData.apiKey;
            authConfig.headerName = formData.headerName;
            break;
          case "bearer":
            authConfig.bearerToken = formData.bearerToken;
            break;
          case "basic":
            authConfig.username = formData.username;
            authConfig.password = formData.password;
            break;
        }
      }

      const response = await fetch(`/api/integrations/${editingIntegration.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          url: formData.url,
          headers,
          authType: formData.authType,
          authConfig,
          events: formData.events,
        }),
      });

      if (response.ok) {
        toast.success("Integration updated");
        setShowAddDialog(false);
        resetForm();
        loadIntegrations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update integration");
      }
    } catch (error) {
      toast.error("Failed to update integration");
    }
  };

  const handleTestIntegration = async (integration: Integration) => {
    setTestingId(integration.id);
    try {
      const response = await fetch(`/api/integrations/${integration.id}/test`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`Test successful! Response time: ${data.duration}ms`);
      } else {
        toast.error(data.error || `Test failed: ${data.message}`);
      }
    } catch (error) {
      toast.error("Failed to test integration");
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleIntegration = async (integration: Integration) => {
    try {
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !integration.isEnabled }),
      });

      if (response.ok) {
        toast.success(integration.isEnabled ? "Integration disabled" : "Integration enabled");
        loadIntegrations();
      } else {
        toast.error("Failed to update integration");
      }
    } catch (error) {
      toast.error("Failed to update integration");
    }
  };

  const handleDeleteIntegration = async () => {
    if (!deletingId) return;
    try {
      const response = await fetch(`/api/integrations/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Integration deleted");
        loadIntegrations();
      } else {
        toast.error("Failed to delete integration");
      }
    } catch (error) {
      toast.error("Failed to delete integration");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditIntegration = async (integration: Integration) => {
    try {
      const response = await fetch(`/api/integrations/${integration.id}`);
      if (response.ok) {
        const data = await response.json();
        const config = data.integration.config || {};

        setFormData({
          name: data.integration.name,
          description: data.integration.description || "",
          type: data.integration.type,
          url: config.url || "",
          headers: config.headers ? JSON.stringify(config.headers, null, 2) : "",
          authType: config.authType || "none",
          apiKey: config.authConfig?.apiKey || "",
          bearerToken: config.authConfig?.bearerToken || "",
          headerName: config.authConfig?.headerName || "X-API-Key",
          username: config.authConfig?.username || "",
          password: config.authConfig?.password || "",
          events: data.integration.events || [],
        });
        setEditingIntegration(integration);
        setShowAddDialog(true);
      }
    } catch (error) {
      toast.error("Failed to load integration details");
    }
  };

  // API Key handlers
  const handleCreateAPIKey = async () => {
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyFormData.name,
          description: keyFormData.description || undefined,
          scopes: keyFormData.scopes,
          expiresAt: keyFormData.expiresAt || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedKey(data.apiKey.key);
        setShowCreateKeyDialog(false);
        setShowNewKeyDialog(true);
        setKeyFormData({ name: "", description: "", scopes: ["mcp:read", "mcp:write"], expiresAt: "" });
        loadAPIKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create API key");
      }
    } catch (error) {
      toast.error("Failed to create API key");
    }
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;
    try {
      const response = await fetch(`/api/api-keys/${keyToRevoke.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      if (response.ok) {
        toast.success("API key revoked");
        loadAPIKeys();
      } else {
        toast.error("Failed to revoke API key");
      }
    } catch (error) {
      toast.error("Failed to revoke API key");
    } finally {
      setKeyToRevoke(null);
    }
  };

  const handleDeleteKey = async (key: APIKey) => {
    if (!confirm(`Delete "${key.name}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/api-keys/${key.id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("API key deleted");
        loadAPIKeys();
      } else {
        toast.error("Failed to delete API key");
      }
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Stats
  const activeIntegrations = integrations.filter((i) => i.isEnabled).length;
  const outgoingWebhooks = integrations.filter((i) => i.type === "webhook_outgoing").length;
  const totalBuiltinTools = Object.values(BUILTIN_TOOLS).reduce((sum, tools) => sum + tools.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect external apps, manage webhooks, and configure API access
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeIntegrations}</div>
            <p className="text-xs text-muted-foreground">of {integrations.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outgoing Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outgoingWebhooks}</div>
            <p className="text-xs text-muted-foreground">Configured webhooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.filter((k) => k.isActive).length}</div>
            <p className="text-xs text-muted-foreground">Active keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Built-in AI Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBuiltinTools}</div>
            <p className="text-xs text-muted-foreground">Available tools</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">
            <Webhook className="h-4 w-4 mr-2" />
            Integrations ({integrations.length})
          </TabsTrigger>
          <TabsTrigger value="keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys ({apiKeys.length})
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Wrench className="h-4 w-4 mr-2" />
            Built-in AI Tools ({totalBuiltinTools})
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Webhook Integrations</CardTitle>
                <CardDescription>
                  Configure outgoing webhooks to send CRM events to external services
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadIntegrations}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Dialog open={showAddDialog} onOpenChange={(open) => {
                  setShowAddDialog(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Integration
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingIntegration ? "Edit Integration" : "Add Integration"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure an outgoing webhook to send CRM events to external services
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            placeholder="Courier Integration"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(v) => setFormData({ ...formData, type: v })}
                            disabled={!!editingIntegration}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="webhook_outgoing">
                                <div className="flex items-center gap-2">
                                  <ArrowUpRight className="h-4 w-4" />
                                  Outgoing Webhook
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Send new orders to courier software"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="url">Webhook URL *</Label>
                        <Input
                          id="url"
                          placeholder="https://api.courier.com/webhooks/orders"
                          value={formData.url}
                          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="headers">Custom Headers (JSON)</Label>
                        <Textarea
                          id="headers"
                          placeholder='{"X-Custom-Header": "value"}'
                          value={formData.headers}
                          onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Authentication</Label>
                        <Select
                          value={formData.authType}
                          onValueChange={(v) => setFormData({ ...formData, authType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="api_key">API Key</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.authType === "api_key" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Header Name</Label>
                            <Input
                              placeholder="X-API-Key"
                              value={formData.headerName}
                              onChange={(e) => setFormData({ ...formData, headerName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              value={formData.apiKey}
                              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {formData.authType === "bearer" && (
                        <div className="space-y-2">
                          <Label>Bearer Token</Label>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            value={formData.bearerToken}
                            onChange={(e) => setFormData({ ...formData, bearerToken: e.target.value })}
                          />
                        </div>
                      )}

                      {formData.authType === "basic" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Username</Label>
                            <Input
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Trigger Events *</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Select which CRM events will trigger this webhook
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                          {WEBHOOK_EVENTS.map((event) => (
                            <div key={event.key} className="flex items-center gap-2">
                              <Checkbox
                                id={event.key}
                                checked={formData.events.includes(event.key)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData({ ...formData, events: [...formData.events, event.key] });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      events: formData.events.filter((e) => e !== event.key),
                                    });
                                  }
                                }}
                              />
                              <label htmlFor={event.key} className="text-sm cursor-pointer">
                                {event.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setShowAddDialog(false);
                        resetForm();
                      }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={editingIntegration ? handleUpdateIntegration : handleAddIntegration}
                        disabled={!formData.name || !formData.url || formData.events.length === 0}
                      >
                        {editingIntegration ? "Save Changes" : "Create Integration"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : integrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No integrations configured</p>
                  <p className="text-sm mt-1">
                    Create an outgoing webhook to send CRM events to external services
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div
                      key={integration.id}
                      className={`p-4 rounded-lg border ${!integration.isEnabled ? "opacity-60 bg-muted/50" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-muted">
                            <ArrowUpRight className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{integration.name}</h3>
                              <Badge variant={integration.isEnabled ? "default" : "secondary"}>
                                {integration.isEnabled ? "Active" : "Disabled"}
                              </Badge>
                            </div>
                            {integration.description && (
                              <p className="text-sm text-muted-foreground">{integration.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{integration.events.length} events</span>
                              {integration.lastTriggeredAt && (
                                <span>
                                  Last triggered{" "}
                                  {formatDistanceToNow(new Date(integration.lastTriggeredAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {integration.successCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-500" />
                                {integration.failureCount}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={integration.isEnabled}
                            onCheckedChange={() => handleToggleIntegration(integration)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestIntegration(integration)}
                            disabled={testingId === integration.id || !integration.isEnabled}
                          >
                            {testingId === integration.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditIntegration(integration)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(integration.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Create API keys to allow external applications to access your CRM via MCP
                </CardDescription>
              </div>
              <Dialog open={showCreateKeyDialog} onOpenChange={setShowCreateKeyDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create API Key</DialogTitle>
                    <DialogDescription>Create a new API key for MCP server access</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Name *</Label>
                      <Input
                        id="keyName"
                        placeholder="Production Key"
                        value={keyFormData.name}
                        onChange={(e) => setKeyFormData({ ...keyFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="keyDescription">Description</Label>
                      <Textarea
                        id="keyDescription"
                        placeholder="Used for Claude Desktop integration"
                        value={keyFormData.description}
                        onChange={(e) => setKeyFormData({ ...keyFormData, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="space-y-2">
                        {SCOPE_OPTIONS.map((scope) => (
                          <div key={scope.value} className="flex items-start gap-3 p-2 rounded border">
                            <Checkbox
                              id={scope.value}
                              checked={keyFormData.scopes.includes(scope.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setKeyFormData({
                                    ...keyFormData,
                                    scopes: [...keyFormData.scopes, scope.value],
                                  });
                                } else {
                                  setKeyFormData({
                                    ...keyFormData,
                                    scopes: keyFormData.scopes.filter((s) => s !== scope.value),
                                  });
                                }
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={scope.value} className="text-sm font-medium cursor-pointer">
                                {scope.label}
                              </label>
                              <p className="text-xs text-muted-foreground">{scope.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">Expiration (optional)</Label>
                      <Input
                        id="expiresAt"
                        type="datetime-local"
                        value={keyFormData.expiresAt}
                        onChange={(e) => setKeyFormData({ ...keyFormData, expiresAt: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Leave empty for no expiration</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateKeyDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateAPIKey}
                      disabled={!keyFormData.name || keyFormData.scopes.length === 0}
                    >
                      Create Key
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys created</p>
                  <p className="text-sm">Create an API key to connect external MCP clients</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className={`p-4 rounded-lg border ${!key.isActive ? "opacity-60 bg-muted/50" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{key.name}</h3>
                            {!key.isActive && <Badge variant="destructive">Revoked</Badge>}
                            {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                              <Badge variant="destructive">Expired</Badge>
                            )}
                          </div>
                          {key.description && (
                            <p className="text-sm text-muted-foreground">{key.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                            <div className="flex items-center gap-1 font-mono bg-muted px-2 py-1 rounded">
                              {key.keyPrefix}•••••••••••
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {key.scopes.map((s) => s.split(":")[1]).join(", ")}
                            </div>
                            {key.lastUsedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                              </div>
                            )}
                            {key.usageCount > 0 && <span>{key.usageCount} requests</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {key.isActive && (
                            <Button variant="outline" size="sm" onClick={() => setKeyToRevoke(key)}>
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteKey(key)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Usage Instructions */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium mb-2">How to use API keys</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Use your API key to connect external MCP clients like Claude Desktop:
                </p>
                <div className="font-mono text-xs bg-background p-3 rounded border overflow-x-auto">
                  <div className="text-muted-foreground"># Connect via SSE</div>
                  <div>curl -H "X-API-Key: ycrm_your_key_here" \</div>
                  <div className="pl-4">
                    {typeof window !== "undefined" ? window.location.origin : ""}/api/mcp/sse
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Built-in AI Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Built-in AI Tools</CardTitle>
              <CardDescription>
                These tools are available by default and allow the AI assistant to interact with your CRM data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {Object.entries(BUILTIN_TOOLS).map(([category, tools]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger>
                      {CATEGORY_LABELS[category]} ({tools.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {tools.map((tool) => (
                          <div
                            key={tool.name}
                            className="flex items-center gap-2 p-2 rounded-md border bg-muted/50"
                          >
                            <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{tool.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Key Created Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              <span className="text-destructive font-medium">
                Save this key now. You won't be able to see it again.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <Input
                type={showKeyValue ? "text" : "password"}
                value={newlyCreatedKey || ""}
                readOnly
                className="font-mono"
              />
              <Button variant="outline" size="icon" onClick={() => setShowKeyValue(!showKeyValue)}>
                {showKeyValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(newlyCreatedKey || "")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowNewKeyDialog(false);
                setNewlyCreatedKey(null);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Key Confirmation */}
      <AlertDialog open={!!keyToRevoke} onOpenChange={() => setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disable the key "{keyToRevoke?.name}". Any applications using this key
              will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Integration Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this integration and its configuration. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIntegration}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IntegrationsLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Loading...</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<IntegrationsLoading />}>
      <IntegrationsContent />
    </Suspense>
  );
}
