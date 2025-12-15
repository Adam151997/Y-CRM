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
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Check,
  X,
  Plug,
  PlugZap,
  Trash2,
  Settings,
  Wrench,
  ExternalLink,
  RefreshCw,
  Server,
  Terminal,
  Globe,
  Key,
  ChevronDown,
} from "lucide-react";

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

export default function AIToolsSettingsPage() {
  const [integrations, setIntegrations] = useState<MCPIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<MCPIntegration | null>(null);
  const [integrationTools, setIntegrationTools] = useState<MCPTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  // Form state for adding new integration
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

  useEffect(() => {
    loadIntegrations();
  }, []);

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
        loadIntegrations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add integration");
      }
    } catch (error) {
      toast.error("Failed to add integration");
    }
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

  const handleDelete = async (integration: MCPIntegration) => {
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
          Manage AI assistant capabilities and external MCP server connections
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              From {integrations.filter((i) => i.status === "CONNECTED").length} connected servers
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
      </div>

      <Tabs defaultValue="builtin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builtin">
            <Wrench className="h-4 w-4 mr-2" />
            Built-in Tools ({totalBuiltinTools})
          </TabsTrigger>
          <TabsTrigger value="mcp">
            <Plug className="h-4 w-4 mr-2" />
            MCP Integrations ({integrations.length})
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

        {/* MCP Integrations Tab */}
        <TabsContent value="mcp" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>MCP Server Integrations</CardTitle>
                <CardDescription>
                  Connect external MCP servers to extend AI capabilities with additional tools
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
                      Connect to an external MCP server to add more tools for the AI assistant
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
                              SSE (HTTP/WebSocket)
                            </div>
                          </SelectItem>
                          <SelectItem value="STDIO">
                            <div className="flex items-center gap-2">
                              <Terminal className="h-4 w-4" />
                              STDIO (Local Process)
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
                          <SelectItem value="API_KEY">API Key (X-API-Key header)</SelectItem>
                          <SelectItem value="BEARER">Bearer Token</SelectItem>
                          <SelectItem value="CUSTOM_HEADER">Custom Header</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.authType !== "NONE" && (
                      <div className="space-y-2">
                        {formData.authType === "CUSTOM_HEADER" ? (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor="headerName">Header Name</Label>
                                <Input
                                  id="headerName"
                                  placeholder="X-Custom-Auth"
                                  value={formData.headerName}
                                  onChange={(e) => setFormData({ ...formData, headerName: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="headerValue">Header Value</Label>
                                <Input
                                  id="headerValue"
                                  type="password"
                                  placeholder="••••••••"
                                  value={formData.headerValue}
                                  onChange={(e) => setFormData({ ...formData, headerValue: e.target.value })}
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div>
                            <Label htmlFor="apiKey">
                              {formData.authType === "BEARER" ? "Bearer Token" : "API Key"}
                            </Label>
                            <Input
                              id="apiKey"
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
                      <div className="space-y-0.5">
                        <Label>Auto-connect on startup</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically connect when CRM loads
                        </p>
                      </div>
                      <Switch
                        checked={formData.autoConnect}
                        onCheckedChange={(v) => setFormData({ ...formData, autoConnect: v })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddIntegration} disabled={!formData.name}>
                      Add Server
                    </Button>
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
                  <p className="text-sm">Add an MCP server to extend AI capabilities</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-md bg-muted">
                          {integration.transportType === "SSE" ? (
                            <Globe className="h-5 w-5" />
                          ) : (
                            <Terminal className="h-5 w-5" />
                          )}
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
                          <p className="text-xs text-muted-foreground mt-1">
                            {integration.transportType === "SSE"
                              ? integration.serverUrl
                              : `${integration.command} ${(integration.args || []).join(" ")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.status === "CONNECTED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTools(integration)}
                          >
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
                            {connecting === integration.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Disconnect
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(integration)}
                            disabled={connecting === integration.id || !integration.isEnabled}
                          >
                            {connecting === integration.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <PlugZap className="h-4 w-4 mr-1" />
                                Connect
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(integration)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tools Dialog */}
          <Dialog
            open={!!selectedIntegration}
            onOpenChange={() => setSelectedIntegration(null)}
          >
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Tools from {selectedIntegration?.name}
                </DialogTitle>
                <DialogDescription>
                  {integrationTools.length} tools available from this MCP server
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {loadingTools ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : integrationTools.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No tools available
                  </p>
                ) : (
                  integrationTools.map((tool) => (
                    <div key={tool.name} className="p-3 rounded-md border">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tool.name}</span>
                      </div>
                      {tool.description && (
                        <p className="text-sm text-muted-foreground mt-1 ml-6">
                          {tool.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
