"use client";

import { useEffect, useState } from "react";
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
  X,
  Plug,
  PlugZap,
  Trash2,
  Wrench,
  Server,
  Terminal,
  Globe,
  Key,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MCPIntegration {
  id: string;
  name: string;
  description: string | null;
  transportType: string;
  serverUrl: string | null;
  command: string | null;
  args: string[] | null;
  authType: string | null;
  status: string;
  lastConnectedAt: string | null;
  lastError: string | null;
  capabilities: { tools?: boolean; resources?: boolean; prompts?: boolean } | null;
  toolCount: number;
  isEnabled: boolean;
  autoConnect: boolean;
  createdAt: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: unknown;
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
  key?: string; // Only present when newly created
}

// Built-in tools organized by workspace
const BUILTIN_TOOLS = {
  sales: [
    { name: "create_lead", description: "Create a new lead" },
    { name: "search_leads", description: "Search for leads" },
    { name: "update_lead", description: "Update lead information" },
    { name: "create_contact", description: "Create a new contact" },
    { name: "search_contacts", description: "Search for contacts" },
    { name: "create_account", description: "Create a new account" },
    { name: "search_accounts", description: "Search for accounts" },
    { name: "create_opportunity", description: "Create a sales opportunity" },
    { name: "search_opportunities", description: "Search opportunities" },
    { name: "create_note", description: "Add notes to records" },
  ],
  cs: [
    { name: "create_ticket", description: "Create support ticket" },
    { name: "search_tickets", description: "Search tickets" },
    { name: "update_ticket", description: "Update ticket status" },
    { name: "add_ticket_message", description: "Add message to ticket" },
    { name: "get_health_score", description: "Get account health score" },
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
    { name: "create_segment", description: "Create audience segment" },
    { name: "search_segments", description: "Search segments" },
    { name: "create_form", description: "Create lead capture form" },
    { name: "search_forms", description: "Search forms" },
  ],
  shared: [
    { name: "create_task", description: "Create a task" },
    { name: "complete_task", description: "Mark task complete" },
    { name: "search_tasks", description: "Search tasks" },
    { name: "get_dashboard_stats", description: "Get CRM statistics" },
    { name: "search_documents", description: "Search documents" },
    { name: "create_report", description: "Generate CRM reports" },
    { name: "semantic_search", description: "AI-powered search" },
  ],
  integrations: [
    { name: "get_connected_integrations", description: "List connected apps" },
    { name: "send_email", description: "Send email via Gmail" },
    { name: "search_emails", description: "Search Gmail inbox" },
    { name: "create_calendar_event", description: "Create Google Calendar event" },
    { name: "get_upcoming_events", description: "Get calendar events" },
    { name: "get_today_events", description: "Get today's events" },
    { name: "send_slack_message", description: "Send Slack message" },
    { name: "list_slack_channels", description: "List Slack channels" },
  ],
  customModules: [
    { name: "list_custom_modules", description: "List custom modules" },
    { name: "create_custom_module", description: "Create custom module" },
    { name: "create_custom_field", description: "Add custom field" },
    { name: "create_custom_module_record", description: "Create module record" },
    { name: "search_custom_module_records", description: "Search module records" },
  ],
};

const SCOPE_OPTIONS = [
  { value: "mcp:read", label: "Read", description: "Read CRM data via MCP tools" },
  { value: "mcp:write", label: "Write", description: "Create and update records" },
  { value: "mcp:admin", label: "Admin", description: "Full access including destructive operations" },
];

export default function AIToolsSettingsPage() {
  // MCP Integrations state
  const [integrations, setIntegrations] = useState<MCPIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<MCPIntegration | null>(null);
  const [integrationTools, setIntegrationTools] = useState<MCPTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null);
  const [showKeyValue, setShowKeyValue] = useState(false);

  // Form state for MCP integration
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    transportType: "SSE",
    serverUrl: "",
    command: "",
    args: "",
    authType: "NONE",
    apiKey: "",
    headerName: "",
    headerValue: "",
    autoConnect: true,
  });

  // Form state for API key
  const [keyFormData, setKeyFormData] = useState({
    name: "",
    description: "",
    scopes: ["mcp:read", "mcp:write"] as string[],
    expiresAt: "",
  });

  // Load integrations
  const loadIntegrations = async () => {
    try {
      const response = await fetch("/api/mcp/integrations");
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error("Failed to load MCP integrations:", error);
      toast.error("Failed to load MCP integrations");
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

  // MCP Integration handlers
  const handleAddIntegration = async () => {
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || undefined,
        transportType: formData.transportType,
        autoConnect: formData.autoConnect,
      };

      if (formData.transportType === "SSE") {
        payload.serverUrl = formData.serverUrl;
      } else {
        payload.command = formData.command;
        payload.args = formData.args.split(" ").filter(Boolean);
      }

      if (formData.authType !== "NONE") {
        payload.authType = formData.authType;
        payload.authConfig = {
          apiKey: formData.apiKey || undefined,
          headerName: formData.headerName || undefined,
          headerValue: formData.headerValue || undefined,
        };
      }

      const response = await fetch("/api/mcp/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("MCP integration added");
        setShowAddDialog(false);
        resetIntegrationForm();
        loadIntegrations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add integration");
      }
    } catch (error) {
      toast.error("Failed to add integration");
    }
  };

  const resetIntegrationForm = () => {
    setFormData({
      name: "",
      description: "",
      transportType: "SSE",
      serverUrl: "",
      command: "",
      args: "",
      authType: "NONE",
      apiKey: "",
      headerName: "",
      headerValue: "",
      autoConnect: true,
    });
  };

  const handleConnect = async (integration: MCPIntegration) => {
    setConnecting(integration.id);
    try {
      const response = await fetch(`/api/mcp/integrations/${integration.id}/connect`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Connected to ${integration.name} (${data.toolCount} tools)`);
        loadIntegrations();
      } else {
        toast.error(data.error || "Failed to connect");
      }
    } catch (error) {
      toast.error("Failed to connect");
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (integration: MCPIntegration) => {
    setConnecting(integration.id);
    try {
      const response = await fetch(`/api/mcp/integrations/${integration.id}/connect`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success(`Disconnected from ${integration.name}`);
        loadIntegrations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to disconnect");
      }
    } catch (error) {
      toast.error("Failed to disconnect");
    } finally {
      setConnecting(null);
    }
  };

  const handleDeleteIntegration = async (integration: MCPIntegration) => {
    if (!confirm(`Delete "${integration.name}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/mcp/integrations/${integration.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success(`Deleted ${integration.name}`);
        loadIntegrations();
      } else {
        toast.error("Failed to delete integration");
      }
    } catch (error) {
      toast.error("Failed to delete integration");
    }
  };

  const handleViewTools = async (integration: MCPIntegration) => {
    setSelectedIntegration(integration);
    setLoadingTools(true);
    try {
      const response = await fetch(`/api/mcp/integrations/${integration.id}/tools`);
      if (response.ok) {
        const data = await response.json();
        setIntegrationTools(data.tools || []);
      } else {
        setIntegrationTools([]);
      }
    } catch (error) {
      setIntegrationTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  // API Key handlers
  const handleCreateAPIKey = async () => {
    try {
      const payload = {
        name: keyFormData.name,
        description: keyFormData.description || undefined,
        scopes: keyFormData.scopes,
        expiresAt: keyFormData.expiresAt || undefined,
      };

      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONNECTED":
        return <Badge className="bg-green-500">Connected</Badge>;
      case "CONNECTING":
        return <Badge className="bg-yellow-500">Connecting...</Badge>;
      case "ERROR":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  const totalBuiltinTools = Object.values(BUILTIN_TOOLS).reduce(
    (sum, tools) => sum + tools.length,
    0
  );

  const totalExternalTools = integrations.reduce(
    (sum, i) => sum + (i.status === "CONNECTED" ? i.toolCount : 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Tools & MCP Integrations</h1>
        <p className="text-muted-foreground">
          Manage AI assistant capabilities, MCP servers, and API access
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Built-in Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBuiltinTools}</div>
            <p className="text-xs text-muted-foreground">Across all workspaces</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">External Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExternalTools}</div>
            <p className="text-xs text-muted-foreground">
              From {integrations.filter((i) => i.status === "CONNECTED").length} servers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBuiltinTools + totalExternalTools}</div>
            <p className="text-xs text-muted-foreground">Tools for AI assistant</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.filter(k => k.isActive).length}</div>
            <p className="text-xs text-muted-foreground">Active keys</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="builtin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builtin">
            <Wrench className="h-4 w-4 mr-2" />
            Built-in Tools ({totalBuiltinTools})
          </TabsTrigger>
          <TabsTrigger value="mcp">
            <Plug className="h-4 w-4 mr-2" />
            MCP Servers ({integrations.length})
          </TabsTrigger>
          <TabsTrigger value="keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys ({apiKeys.length})
          </TabsTrigger>
        </TabsList>

        {/* Built-in Tools Tab */}
        <TabsContent value="builtin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Built-in AI Tools</CardTitle>
              <CardDescription>
                These tools are available by default and allow the AI to interact with your CRM data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {Object.entries(BUILTIN_TOOLS).map(([category, tools]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="capitalize">
                      {category === "cs" ? "Customer Success" : category.replace(/([A-Z])/g, " $1")} ({tools.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {tools.map((tool) => (
                          <div
                            key={tool.name}
                            className="flex items-center gap-2 p-2 rounded-md border bg-muted/50"
                          >
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{tool.name}</p>
                              <p className="text-xs text-muted-foreground">{tool.description}</p>
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

        {/* MCP Servers Tab */}
        <TabsContent value="mcp" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>MCP Server Integrations</CardTitle>
                <CardDescription>
                  Connect external MCP servers to extend AI capabilities
                </CardDescription>
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add MCP Server
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add MCP Server</DialogTitle>
                    <DialogDescription>
                      Connect to an external MCP server to add more tools
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        placeholder="GitHub MCP"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="GitHub integration for code repositories"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Transport Type</Label>
                      <Select
                        value={formData.transportType}
                        onValueChange={(v) => setFormData({ ...formData, transportType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SSE">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              SSE (HTTP)
                            </div>
                          </SelectItem>
                          <SelectItem value="STDIO">
                            <div className="flex items-center gap-2">
                              <Terminal className="h-4 w-4" />
                              STDIO (Local)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.transportType === "SSE" ? (
                      <div className="space-y-2">
                        <Label htmlFor="serverUrl">Server URL *</Label>
                        <Input
                          id="serverUrl"
                          placeholder="https://mcp-server.example.com/sse"
                          value={formData.serverUrl}
                          onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="command">Command *</Label>
                          <Input
                            id="command"
                            placeholder="npx"
                            value={formData.command}
                            onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="args">Arguments (space-separated)</Label>
                          <Input
                            id="args"
                            placeholder="-y @modelcontextprotocol/server-github"
                            value={formData.args}
                            onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                          />
                        </div>
                      </>
                    )}
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
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="API_KEY">API Key</SelectItem>
                          <SelectItem value="BEARER">Bearer Token</SelectItem>
                          <SelectItem value="CUSTOM_HEADER">Custom Header</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.authType !== "NONE" && (
                      <div className="space-y-2">
                        {formData.authType === "CUSTOM_HEADER" ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label>Header Name</Label>
                              <Input
                                placeholder="X-Custom-Auth"
                                value={formData.headerName}
                                onChange={(e) => setFormData({ ...formData, headerName: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Header Value</Label>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                value={formData.headerValue}
                                onChange={(e) => setFormData({ ...formData, headerValue: e.target.value })}
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Label>{formData.authType === "BEARER" ? "Bearer Token" : "API Key"}</Label>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              value={formData.apiKey}
                              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-connect on startup</Label>
                        <p className="text-xs text-muted-foreground">Connect when CRM loads</p>
                      </div>
                      <Switch
                        checked={formData.autoConnect}
                        onCheckedChange={(v) => setFormData({ ...formData, autoConnect: v })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddIntegration} disabled={!formData.name}>Add Server</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : integrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No MCP servers configured</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-md bg-muted">
                          {integration.transportType === "SSE" ? <Globe className="h-5 w-5" /> : <Terminal className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{integration.name}</h3>
                            {getStatusBadge(integration.status)}
                            {integration.status === "CONNECTED" && (
                              <Badge variant="outline">{integration.toolCount} tools</Badge>
                            )}
                          </div>
                          {integration.description && (
                            <p className="text-sm text-muted-foreground">{integration.description}</p>
                          )}
                          {integration.status === "ERROR" && integration.lastError && (
                            <p className="text-xs text-destructive mt-1">{integration.lastError}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.status === "CONNECTED" && (
                          <Button variant="outline" size="sm" onClick={() => handleViewTools(integration)}>
                            <Wrench className="h-4 w-4 mr-1" />
                            Tools
                          </Button>
                        )}
                        {integration.status === "CONNECTED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(integration)}
                            disabled={connecting === integration.id}
                          >
                            {connecting === integration.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4 mr-1" />Disconnect</>}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(integration)}
                            disabled={connecting === integration.id || !integration.isEnabled}
                          >
                            {connecting === integration.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PlugZap className="h-4 w-4 mr-1" />Connect</>}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteIntegration(integration)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                    <DialogDescription>
                      Create a new API key for MCP server access
                    </DialogDescription>
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
                                  setKeyFormData({ ...keyFormData, scopes: [...keyFormData.scopes, scope.value] });
                                } else {
                                  setKeyFormData({ ...keyFormData, scopes: keyFormData.scopes.filter(s => s !== scope.value) });
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
                    <Button variant="outline" onClick={() => setShowCreateKeyDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateAPIKey} disabled={!keyFormData.name || keyFormData.scopes.length === 0}>
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
                    <div key={key.id} className={`p-4 rounded-lg border ${!key.isActive ? "opacity-60 bg-muted/50" : ""}`}>
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
                              {key.scopes.map(s => s.split(":")[1]).join(", ")}
                            </div>
                            {key.lastUsedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                              </div>
                            )}
                            {key.usageCount > 0 && (
                              <span>{key.usageCount} requests</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {key.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setKeyToRevoke(key)}
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteKey(key)}
                          >
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
                  <div className="pl-4">{typeof window !== "undefined" ? window.location.origin : ""}/api/mcp/sse</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tools Dialog */}
      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tools from {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>{integrationTools.length} tools available</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {loadingTools ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : integrationTools.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No tools available</p>
            ) : (
              integrationTools.map((tool) => (
                <div key={tool.name} className="p-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{tool.name}</span>
                  </div>
                  {tool.description && (
                    <p className="text-sm text-muted-foreground mt-1 ml-6">{tool.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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
            <Button onClick={() => { setShowNewKeyDialog(false); setNewlyCreatedKey(null); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!keyToRevoke} onOpenChange={() => setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disable the key "{keyToRevoke?.name}". Any applications using this key will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
