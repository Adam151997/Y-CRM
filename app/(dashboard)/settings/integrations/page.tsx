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
import { toast } from "sonner";
import {
  Mail,
  Calendar,
  HardDrive,
  MessageSquare,
  Github,
  BookOpen,
  Layout,
  Users,
  Cloud,
  CheckSquare,
  Trello,
  ClipboardList,
  Check,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  mail: <Mail className="h-6 w-6" />,
  calendar: <Calendar className="h-6 w-6" />,
  "hard-drive": <HardDrive className="h-6 w-6" />,
  "message-square": <MessageSquare className="h-6 w-6" />,
  github: <Github className="h-6 w-6" />,
  book: <BookOpen className="h-6 w-6" />,
  layout: <Layout className="h-6 w-6" />,
  users: <Users className="h-6 w-6" />,
  cloud: <Cloud className="h-6 w-6" />,
  "check-square": <CheckSquare className="h-6 w-6" />,
  trello: <Trello className="h-6 w-6" />,
  clipboard: <ClipboardList className="h-6 w-6" />,
};

// Category colors
const categoryColors: Record<string, string> = {
  communication: "bg-blue-100 text-blue-800",
  productivity: "bg-green-100 text-green-800",
  storage: "bg-purple-100 text-purple-800",
  development: "bg-orange-100 text-orange-800",
  crm: "bg-pink-100 text-pink-800",
};

interface Integration {
  appKey: string;
  appName: string;
  icon: string;
  category: string;
  isConnected: boolean;
  connectionId?: string;
  connectedAt?: string;
  status?: string;
}

const categoryLabels: Record<string, string> = {
  communication: "Communication",
  productivity: "Productivity",
  storage: "Storage",
  development: "Development",
  crm: "CRM & Sales",
  other: "Other",
};

/**
 * Inner component that uses useSearchParams
 * Must be wrapped in Suspense
 */
function IntegrationsContent() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
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
      loadIntegrations(); // Refresh list
    }
    if (error) {
      toast.error(error);
    }
    if (info) {
      toast.info(info);
    }
  }, [searchParams]);

  // Connect to an app
  const handleConnect = async (appKey: string) => {
    setConnecting(appKey);
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
          // Redirect to OAuth
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

  // Disconnect from an app
  const handleDisconnect = async (appKey: string) => {
    setDisconnecting(appKey);
    try {
      const response = await fetch(`/api/integrations/${appKey}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`Disconnected from ${appKey}`);
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

  // Group by category
  const groupedIntegrations = integrations.reduce((acc, integration) => {
    const category = integration.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your favorite apps to Y-CRM</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

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
          {/* Connected count */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="font-medium">
                {integrations.filter((i) => i.isConnected).length} of{" "}
                {integrations.length} apps connected
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Connected apps enable your AI assistant to perform actions on your behalf.
            </p>
          </div>

          {/* Integrations by category */}
          <div className="space-y-8">
            {Object.entries(groupedIntegrations).map(([category, apps]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-4">
                  {categoryLabels[category] || category}
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {apps.map((integration) => (
                    <Card
                      key={integration.appKey}
                      className={
                        integration.isConnected ? "border-green-200 bg-green-50/30" : ""
                      }
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              {iconMap[integration.icon] || (
                                <Cloud className="h-6 w-6" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">{integration.appName}</h4>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  categoryColors[integration.category] || ""
                                }`}
                              >
                                {integration.category}
                              </Badge>
                            </div>
                          </div>
                          {integration.isConnected ? (
                            <Badge className="bg-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not connected</Badge>
                          )}
                        </div>

                        <div className="mt-4">
                          {integration.isConnected ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleDisconnect(integration.appKey)}
                              disabled={disconnecting === integration.appKey}
                            >
                              {disconnecting === integration.appKey ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <X className="h-4 w-4 mr-2" />
                              )}
                              Disconnect
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => handleConnect(integration.appKey)}
                              disabled={connecting === integration.appKey}
                            >
                              {connecting === integration.appKey ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ExternalLink className="h-4 w-4 mr-2" />
                              )}
                              Connect
                            </Button>
                          )}
                        </div>

                        {integration.connectedAt && (
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            Connected {new Date(integration.connectedAt).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What you can do section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What can your AI do with integrations?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Gmail</p>
                <p className="text-sm text-muted-foreground">
                  Send emails, read inbox, search messages
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Google Calendar</p>
                <p className="text-sm text-muted-foreground">
                  Schedule meetings, check availability, create events
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <MessageSquare className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium">Slack</p>
                <p className="text-sm text-muted-foreground">
                  Send messages, create channels, post updates
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Github className="h-5 w-5 text-gray-800 mt-0.5" />
              <div>
                <p className="font-medium">GitHub</p>
                <p className="text-sm text-muted-foreground">
                  Create issues, manage PRs, check repos
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
        <CardDescription>Connect your favorite apps to Y-CRM</CardDescription>
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
