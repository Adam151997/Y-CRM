"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Eye, MousePointerClick, TrendingUp, UserMinus, AlertTriangle } from "lucide-react";

interface Metrics {
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  converted?: number;
  bounced?: number;
  unsubscribed?: number;
}

interface PerformanceFunnelProps {
  metrics: Metrics | null;
  campaignType: string;
}

export function PerformanceFunnel({ metrics, campaignType }: PerformanceFunnelProps) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return null;
  }

  const sent = metrics.sent || 0;
  const delivered = metrics.delivered || sent;
  const opened = metrics.opened || 0;
  const clicked = metrics.clicked || 0;
  const converted = metrics.converted || 0;
  const bounced = metrics.bounced || 0;
  const unsubscribed = metrics.unsubscribed || 0;

  // Calculate rates
  const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0";
  const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : "0";
  const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : "0";
  const conversionRate = clicked > 0 ? ((converted / clicked) * 100).toFixed(1) : "0";
  const overallConversion = sent > 0 ? ((converted / sent) * 100).toFixed(2) : "0";

  // Funnel stages with dynamic widths
  const maxWidth = 100;
  const stages = [
    { 
      label: "Sent", 
      value: sent, 
      width: maxWidth, 
      color: "bg-blue-500",
      icon: Send 
    },
    { 
      label: campaignType === "EMAIL" ? "Opened" : "Impressions", 
      value: opened, 
      width: sent > 0 ? (opened / sent) * maxWidth : 0, 
      rate: openRate,
      color: "bg-indigo-500",
      icon: Eye 
    },
    { 
      label: campaignType === "EMAIL" ? "Clicked" : "Engagements", 
      value: clicked, 
      width: sent > 0 ? (clicked / sent) * maxWidth : 0, 
      rate: clickRate,
      color: "bg-purple-500",
      icon: MousePointerClick 
    },
    { 
      label: "Converted", 
      value: converted, 
      width: sent > 0 ? (converted / sent) * maxWidth : 0, 
      rate: conversionRate,
      color: "bg-green-500",
      icon: TrendingUp 
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Funnel</CardTitle>
        <CardDescription>
          Overall conversion: {overallConversion}% ({converted.toLocaleString()} of {sent.toLocaleString()})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel Visualization */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const minWidth = stage.value > 0 ? Math.max(stage.width, 10) : 0;
            
            return (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stage.value.toLocaleString()}</span>
                    {stage.rate && (
                      <span className="text-muted-foreground text-xs">
                        ({stage.rate}% of previous)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-lg transition-all duration-500 flex items-center justify-center`}
                    style={{ width: `${minWidth}%` }}
                  >
                    {minWidth > 20 && (
                      <span className="text-white text-xs font-medium">
                        {stage.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Metrics */}
        {(bounced > 0 || unsubscribed > 0) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Other Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              {bounced > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="font-medium text-red-700">{bounced.toLocaleString()}</div>
                    <div className="text-xs text-red-600">Bounced ({sent > 0 ? ((bounced / sent) * 100).toFixed(1) : 0}%)</div>
                  </div>
                </div>
              )}
              {unsubscribed > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                  <UserMinus className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="font-medium text-orange-700">{unsubscribed.toLocaleString()}</div>
                    <div className="text-xs text-orange-600">Unsubscribed ({sent > 0 ? ((unsubscribed / sent) * 100).toFixed(1) : 0}%)</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 pt-4 border-t">
          <div className="text-center p-2">
            <div className="text-lg font-bold text-blue-600">{deliveryRate}%</div>
            <div className="text-xs text-muted-foreground">Delivery</div>
          </div>
          <div className="text-center p-2">
            <div className="text-lg font-bold text-indigo-600">{openRate}%</div>
            <div className="text-xs text-muted-foreground">Open Rate</div>
          </div>
          <div className="text-center p-2">
            <div className="text-lg font-bold text-purple-600">{clickRate}%</div>
            <div className="text-xs text-muted-foreground">Click Rate</div>
          </div>
          <div className="text-center p-2">
            <div className="text-lg font-bold text-green-600">{overallConversion}%</div>
            <div className="text-xs text-muted-foreground">Conversion</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
