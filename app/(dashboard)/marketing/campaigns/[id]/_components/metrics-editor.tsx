"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, BarChart3, Save } from "lucide-react";

interface Metrics {
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  converted?: number;
  bounced?: number;
  unsubscribed?: number;
}

interface MetricsEditorProps {
  campaignId: string;
  initialMetrics: Metrics | null;
  campaignType: string;
}

export function MetricsEditor({ campaignId, initialMetrics, campaignType }: MetricsEditorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics || {});

  const handleChange = (field: keyof Metrics, value: string) => {
    const numValue = value === "" ? undefined : parseInt(value, 10);
    setMetrics((prev) => ({ ...prev, [field]: numValue }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      });

      if (!response.ok) {
        throw new Error("Failed to save metrics");
      }

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving metrics:", error);
      alert("Failed to save metrics. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Show different fields based on campaign type
  const isEmailOrSMS = ["EMAIL", "SMS"].includes(campaignType);
  const isSocial = campaignType === "SOCIAL";
  const isEvent = ["EVENT", "WEBINAR"].includes(campaignType);
  const isAds = campaignType === "ADS";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          Edit Metrics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Campaign Metrics</DialogTitle>
          <DialogDescription>
            Manually enter performance metrics for this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Common metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sent">{isEvent ? "Invitations Sent" : "Sent"}</Label>
              <Input
                id="sent"
                type="number"
                min="0"
                placeholder="0"
                value={metrics.sent ?? ""}
                onChange={(e) => handleChange("sent", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivered">{isEvent ? "Delivered" : "Delivered"}</Label>
              <Input
                id="delivered"
                type="number"
                min="0"
                placeholder="0"
                value={metrics.delivered ?? ""}
                onChange={(e) => handleChange("delivered", e.target.value)}
              />
            </div>
          </div>

          {/* Email/SMS specific */}
          {isEmailOrSMS && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opened">Opened</Label>
                <Input
                  id="opened"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics.opened ?? ""}
                  onChange={(e) => handleChange("opened", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clicked">Clicked</Label>
                <Input
                  id="clicked"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics.clicked ?? ""}
                  onChange={(e) => handleChange("clicked", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Social specific */}
          {isSocial && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opened">Impressions</Label>
                <Input
                  id="opened"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics.opened ?? ""}
                  onChange={(e) => handleChange("opened", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clicked">Engagements</Label>
                <Input
                  id="clicked"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics.clicked ?? ""}
                  onChange={(e) => handleChange("clicked", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Event specific */}
          {isEvent && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opened">Registered</Label>
                <Input
                  id="opened"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics.opened ?? ""}
                  onChange={(e) => handleChange("opened", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clicked">Attended</Label>
                <Input
                  id="clicked"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics.clicked ?? ""}
                  onChange={(e) => handleChange("clicked", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Ads specific */}
          {isAds && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opened">Impressions</Label>
                <Input
                  id="opened"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics.opened ?? ""}
                  onChange={(e) => handleChange("opened", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clicked">Clicks</Label>
                <Input
                  id="clicked"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics.clicked ?? ""}
                  onChange={(e) => handleChange("clicked", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Conversions - common to all */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="converted">Converted</Label>
              <Input
                id="converted"
                type="number"
                min="0"
                placeholder="0"
                value={metrics.converted ?? ""}
                onChange={(e) => handleChange("converted", e.target.value)}
              />
            </div>
            {isEmailOrSMS && (
              <div className="space-y-2">
                <Label htmlFor="unsubscribed">Unsubscribed</Label>
                <Input
                  id="unsubscribed"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics.unsubscribed ?? ""}
                  onChange={(e) => handleChange("unsubscribed", e.target.value)}
                />
              </div>
            )}
          </div>

          {isEmailOrSMS && (
            <div className="space-y-2">
              <Label htmlFor="bounced">Bounced</Label>
              <Input
                id="bounced"
                type="number"
                min="0"
                placeholder="0"
                value={metrics.bounced ?? ""}
                onChange={(e) => handleChange("bounced", e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Metrics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
