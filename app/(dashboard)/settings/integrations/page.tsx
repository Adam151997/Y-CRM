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
  Check,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
  Mail,
  Calendar,
  HardDrive,
  FileText,
  Table,
  Video,
  MessageSquare,
  Chrome,
} from "lucide-react";

interface Integration {
  key: string;
  name: string;
  description: string;
  logo: string;
  category: string;
  authMethod: string;
  services: string[];
  isConnected: boolean;
  connectedAs?: string;
  connectedAt?: string;
}

// Service icons for Google services
const serviceIcons: Record<string, React.ReactNode> = {
  Gmail: <Mail className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  Drive: <HardDrive className="h-4 w-4" />,
  Docs: <FileText className="h-4 w-4" />,
  Sheets: <Table className="h-4 w-4" />,
  Meet: <Video className="h-4 w-4" />,
  Messaging: <MessageSquare className="h-4 w-4" />,
};

/**
 * Inner component that uses useSearchParams
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

  // Handle URL params (success/error messages from OAuth callback)
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      toast.success(success);
      // Clean URL
      window.history.replaceState({}, "", "/settings/integrations");
      loadIntegrations();
    }
    if (error) {
      toast.error(error);
      window.history.replaceState({}, "", "/settings/integrations");
    }
  }, [searchParams]);

  // Connect to an integration
  const handleConnect = async (integration: Integration) => {
    setConnecting(integration.key);
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey: integration.key }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
          // Redirect to OAuth provider
          window.location.href = data.redirectUrl;
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to connect");
        setConnecting(null);
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to initiate connection");
      setConnecting(null);
    }
  };

  // Disconnect from an integration
  const handleDisconnect = async (key: string) => {
    setDisconnecting(key);
    try {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey: key }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Disconnected successfully");
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your apps to Y CRM</CardDescription>
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
              Connect your apps to enable AI-powered actions. Your AI assistant
              can send emails, create calendar events, and more.
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
                {connectedCount} of {integrations.length} integrations connected
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Connected integrations enable your AI assistant to perform actions on your behalf.
            </p>
          </div>

          {/* Integrations list */}
          <div className="space-y-4">
            {integrations.map((integration) => (
              <Card
                key={integration.key}
                className={
                  integration.isConnected
                    ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10"
                    : ""
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="h-14 w-14 p-3 bg-white dark:bg-gray-800 rounded-xl border flex items-center justify-center">
                        {integration.key === "google" ? (
                          <Chrome className="h-8 w-8 text-blue-500" />
                        ) : (
                          <MessageSquare className="h-8 w-8 text-purple-500" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{integration.name}</h3>
                          {integration.isConnected && (
                            <Badge className="bg-green-600 dark:bg-green-700">
                              <Check className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>

                        {/* Services included */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {integration.services.map((service) => (
                            <Badge key={service} variant="secondary" className="text-xs">
                              {serviceIcons[service]}
                              <span className="ml-1">{service}</span>
                            </Badge>
                          ))}
                        </div>

                        {/* Connected info */}
                        {integration.isConnected && integration.connectedAs && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Connected as: {integration.connectedAs}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div>
                      {integration.isConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(integration.key)}
                          disabled={disconnecting === integration.key}
                        >
                          {disconnecting === integration.key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Disconnect
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleConnect(integration)}
                          disabled={connecting === integration.key}
                        >
                          {connecting === integration.key ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ExternalLink className="h-4 w-4 mr-2" />
                          )}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What you can do section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What can your AI assistant do?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Gmail</p>
                <p className="text-sm text-muted-foreground">
                  Send emails, read inbox, search messages
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Google Calendar</p>
                <p className="text-sm text-muted-foreground">
                  Schedule meetings, check availability
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <HardDrive className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Google Drive</p>
                <p className="text-sm text-muted-foreground">
                  Store files, create folders, share documents
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Google Docs & Sheets</p>
                <p className="text-sm text-muted-foreground">
                  Create documents and spreadsheets
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Video className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Google Meet</p>
                <p className="text-sm text-muted-foreground">
                  Create meeting links automatically
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <MessageSquare className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Slack</p>
                <p className="text-sm text-muted-foreground">
                  Send messages to channels and users
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
 * Loading fallback
 */
function IntegrationsLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect your apps to Y CRM</CardDescription>
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
