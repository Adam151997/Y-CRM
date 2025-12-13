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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Check,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
  Mail,
  Calendar,
  MessageSquare,
  Megaphone,
  BarChart3,
  Database,
  Key,
} from "lucide-react";
import Image from "next/image";

interface Integration {
  appKey: string;
  appName: string;
  logo: string;
  category: string;
  description: string;
  authMethod: string;
  integrationId: string;
  isConnected: boolean;
  connectionId?: string;
  connectedAt?: string;
  status?: string;
  error?: string;
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string; order: number }> = {
  communication: { 
    label: "Communication", 
    icon: <MessageSquare className="h-5 w-5" />,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    order: 1,
  },
  calendar: { 
    label: "Calendar", 
    icon: <Calendar className="h-5 w-5" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    order: 2,
  },
  productivity: { 
    label: "Productivity", 
    icon: <Check className="h-5 w-5" />,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    order: 3,
  },
  advertising: { 
    label: "Advertising", 
    icon: <Megaphone className="h-5 w-5" />,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    order: 4,
  },
  marketing: { 
    label: "Marketing", 
    icon: <Mail className="h-5 w-5" />,
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    order: 5,
  },
  data_enrichment: { 
    label: "Data Enrichment", 
    icon: <Database className="h-5 w-5" />,
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    order: 6,
  },
};

// Credential fields for form-based auth apps
const credentialFields: Record<string, { label: string; key: string; type: string; placeholder: string }[]> = {
  facebookads: [
    { label: "Access Token", key: "access_token", type: "password", placeholder: "Enter your Meta Ads access token" },
  ],
  zoominfo: [
    { label: "Username", key: "username", type: "text", placeholder: "Enter your ZoomInfo username" },
    { label: "Password", key: "password", type: "password", placeholder: "Enter your ZoomInfo password" },
  ],
};

/**
 * App logo component with fallback
 */
function AppLogo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <span className="text-lg font-bold text-muted-foreground">
          {alt.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain ${className}`}
      onError={() => setError(true)}
    />
  );
}

/**
 * Inner component that uses useSearchParams
 * Must be wrapped in Suspense
 */
function IntegrationsContent() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [credentialDialog, setCredentialDialog] = useState<Integration | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [savingCredentials, setSavingCredentials] = useState(false);
  const searchParams = useSearchParams();

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

  useEffect(() => {
    loadIntegrations();
  }, []);

  // Handle URL params (success/error messages from callback)
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const info = searchParams.get("info");

    if (success) {
      toast.success(success);
      loadIntegrations();
    }
    if (error) {
      toast.error(error);
    }
    if (info) {
      toast.info(info);
    }
  }, [searchParams]);

  // Connect to an app (OAuth)
  const handleConnect = async (integration: Integration) => {
    // Check if this app requires credentials instead of OAuth
    if (integration.authMethod === "api_key" || integration.authMethod === "basic_jwt") {
      setCredentialDialog(integration);
      setCredentials({});
      return;
    }

    setConnecting(integration.appKey);
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey: integration.appKey }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to connect");
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to initiate connection");
    } finally {
      setConnecting(null);
    }
  };

  // Save credentials for API key / Basic auth apps
  const handleSaveCredentials = async () => {
    if (!credentialDialog) return;

    setSavingCredentials(true);
    try {
      const response = await fetch("/api/integrations/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appKey: credentialDialog.appKey,
          credentials,
        }),
      });

      if (response.ok) {
        toast.success(`Connected to ${credentialDialog.appName}`);
        setCredentialDialog(null);
        loadIntegrations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save credentials");
      }
    } catch (error) {
      console.error("Credential save error:", error);
      toast.error("Failed to save credentials");
    } finally {
      setSavingCredentials(false);
    }
  };

  // Disconnect from an app
  const handleDisconnect = async (appKey: string) => {
    setDisconnecting(appKey);
    try {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `Disconnected`);
        loadIntegrations();
      } else {
        toast.error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  // Group by category and sort
  const groupedIntegrations = integrations.reduce((acc, integration) => {
    const category = integration.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  // Sort categories by order
  const sortedCategories = Object.keys(groupedIntegrations).sort((a, b) => {
    const orderA = categoryConfig[a]?.order || 99;
    const orderB = categoryConfig[b]?.order || 99;
    return orderA - orderB;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your favorite apps to Y CRM</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const connectedCount = integrations.filter((i) => i.isConnected).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Connect external apps to enable AI-powered actions. Your AI assistant
              can send emails, create calendar events, manage tasks, and more.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadIntegrations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {/* Connected summary */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="font-medium">
                {connectedCount} of {integrations.length} apps connected
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Connected apps enable your AI assistant to perform actions on your behalf.
            </p>
          </div>

          {/* Integrations by category */}
          <div className="space-y-8">
            {sortedCategories.map((category) => {
              const config = categoryConfig[category];
              const apps = groupedIntegrations[category];

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    {config?.icon}
                    <h3 className="font-semibold text-lg">
                      {config?.label || category}
                    </h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {apps.map((integration) => (
                      <Card
                        key={integration.appKey}
                        className={
                          integration.isConnected 
                            ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10" 
                            : ""
                        }
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 p-2 bg-white dark:bg-gray-800 rounded-lg border flex items-center justify-center">
                                <AppLogo
                                  src={integration.logo}
                                  alt={integration.appName}
                                  className="h-8 w-8"
                                />
                              </div>
                              <div>
                                <h4 className="font-medium">{integration.appName}</h4>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs mt-1 ${config?.color || ""}`}
                                >
                                  {config?.label || category}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {integration.description}
                          </p>

                          {/* Auth method badge */}
                          {(integration.authMethod === "api_key" || integration.authMethod === "basic_jwt") && !integration.isConnected && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                              <Key className="h-3 w-3" />
                              <span>Requires credentials</span>
                            </div>
                          )}

                          {/* Connection status & action */}
                          <div className="flex items-center justify-between">
                            {integration.isConnected ? (
                              <>
                                <Badge className="bg-green-600 dark:bg-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDisconnect(integration.appKey)}
                                  disabled={disconnecting === integration.appKey}
                                >
                                  {disconnecting === integration.appKey ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Badge variant="outline">Not connected</Badge>
                                <Button
                                  size="sm"
                                  onClick={() => handleConnect(integration)}
                                  disabled={connecting === integration.appKey}
                                >
                                  {connecting === integration.appKey ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                  )}
                                  Connect
                                </Button>
                              </>
                            )}
                          </div>

                          {integration.connectedAt && (
                            <p className="text-xs text-muted-foreground mt-3">
                              Connected {new Date(integration.connectedAt).toLocaleDateString()}
                            </p>
                          )}

                          {integration.error && (
                            <p className="text-xs text-destructive mt-2">
                              Error: {integration.error}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Credential Dialog for API Key / Basic Auth */}
      <Dialog open={!!credentialDialog} onOpenChange={(open) => !open && setCredentialDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {credentialDialog && (
                <div className="h-8 w-8 p-1 bg-white dark:bg-gray-800 rounded border">
                  <AppLogo
                    src={credentialDialog.logo}
                    alt={credentialDialog.appName}
                    className="h-6 w-6"
                  />
                </div>
              )}
              Connect to {credentialDialog?.appName}
            </DialogTitle>
            <DialogDescription>
              Enter your credentials to connect. Your credentials are securely stored
              and used only to execute actions on your behalf.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {credentialDialog && credentialFields[credentialDialog.appKey]?.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={credentials[field.key] || ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCredentials} disabled={savingCredentials}>
              {savingCredentials && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* What you can do section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What can your AI assistant do?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Communication</p>
                <p className="text-sm text-muted-foreground">
                  Send emails, Slack messages, WhatsApp
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Calendar</p>
                <p className="text-sm text-muted-foreground">
                  Schedule meetings, check availability
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Productivity</p>
                <p className="text-sm text-muted-foreground">
                  Create tasks in Notion, Trello, Asana
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Megaphone className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Advertising</p>
                <p className="text-sm text-muted-foreground">
                  Manage Google Ads, Meta Ads campaigns
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Marketing</p>
                <p className="text-sm text-muted-foreground">
                  Create Mailchimp campaigns, audiences
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Database className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Data Enrichment</p>
                <p className="text-sm text-muted-foreground">
                  Enrich leads with LinkedIn, ZoomInfo
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Loading fallback for Suspense
 */
function IntegrationsLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect your favorite apps to Y CRM</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

/**
 * Main page component with Suspense boundary
 */
export default function IntegrationsPage() {
  return (
    <Suspense fallback={<IntegrationsLoading />}>
      <IntegrationsContent />
    </Suspense>
  );
}
