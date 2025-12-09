"use client";

import { ComponentType } from "react";
import { getWidgetById } from "@/lib/dashboard/widget-registry";
import { WidgetWrapper } from "./widget-wrapper";
import {
  // Sales
  PipelineValueWidget,
  LeadsByStatusWidget,
  DealsClosingWidget,
  ConversionRateWidget,
  // CS
  OpenTicketsWidget,
  HealthDistributionWidget,
  UpcomingRenewalsWidget,
  AtRiskAccountsWidget,
  // Marketing
  CampaignPerformanceWidget,
  FormSubmissionsWidget,
  SegmentSizesWidget,
  // Global
  TasksDueTodayWidget,
  RecentActivityWidget,
  QuickStatsWidget,
} from "./widgets";

// Widget component map
const WIDGET_COMPONENTS: Record<string, ComponentType> = {
  // Sales
  "pipeline-value": PipelineValueWidget,
  "leads-by-status": LeadsByStatusWidget,
  "deals-closing": DealsClosingWidget,
  "conversion-rate": ConversionRateWidget,
  // CS
  "open-tickets": OpenTicketsWidget,
  "health-distribution": HealthDistributionWidget,
  "upcoming-renewals": UpcomingRenewalsWidget,
  "at-risk-accounts": AtRiskAccountsWidget,
  // Marketing
  "campaign-performance": CampaignPerformanceWidget,
  "form-submissions": FormSubmissionsWidget,
  "segment-sizes": SegmentSizesWidget,
  // Global
  "tasks-due-today": TasksDueTodayWidget,
  "recent-activity": RecentActivityWidget,
  "quick-stats": QuickStatsWidget,
};

interface WidgetRendererProps {
  widgetId: string;
  isEditing?: boolean;
  onRemove?: () => void;
  onSettings?: () => void;
}

export function WidgetRenderer({
  widgetId,
  isEditing = false,
  onRemove,
  onSettings,
}: WidgetRendererProps) {
  // Extract base widget type (remove unique suffix like "-1234567890")
  const baseWidgetId = widgetId.replace(/-\d+$/, "");
  
  const widgetDef = getWidgetById(baseWidgetId);
  const WidgetComponent = WIDGET_COMPONENTS[baseWidgetId];

  if (!widgetDef || !WidgetComponent) {
    return (
      <div className="h-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground text-sm">Widget not found: {widgetId}</p>
      </div>
    );
  }

  return (
    <WidgetWrapper
      widget={widgetDef}
      isEditing={isEditing}
      onRemove={onRemove}
      onSettings={onSettings}
    >
      <WidgetComponent />
    </WidgetWrapper>
  );
}
