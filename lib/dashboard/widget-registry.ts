import { LucideIcon } from "lucide-react";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Ticket,
  HeartPulse,
  RefreshCw,
  AlertTriangle,
  Megaphone,
  FileInput,
  CheckSquare,
  Activity,
  BarChart3,
  PieChart,
} from "lucide-react";
import { WorkspaceType } from "@/lib/workspace";

export type WidgetSize = "sm" | "md" | "lg" | "xl";

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  workspaces: WorkspaceType[] | "all";
  category: "metrics" | "charts" | "lists" | "activity";
}

// Widget Registry - All available widgets
export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // === SALES WIDGETS ===
  "pipeline-value": {
    id: "pipeline-value",
    name: "Pipeline Value",
    description: "Total value of all open opportunities",
    icon: DollarSign,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    workspaces: ["sales"],
    category: "metrics",
  },
  "deals-closing": {
    id: "deals-closing",
    name: "Deals Closing Soon",
    description: "Opportunities closing in the next 30 days",
    icon: TrendingUp,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
    workspaces: ["sales"],
    category: "lists",
  },
  "leads-by-status": {
    id: "leads-by-status",
    name: "Leads by Status",
    description: "Distribution of leads across statuses",
    icon: Users,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 4 },
    workspaces: ["sales"],
    category: "charts",
  },
  "conversion-rate": {
    id: "conversion-rate",
    name: "Conversion Rate",
    description: "Lead to opportunity conversion rate",
    icon: Target,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
    workspaces: ["sales"],
    category: "metrics",
  },

  // === CS WIDGETS ===
  "open-tickets": {
    id: "open-tickets",
    name: "Open Tickets",
    description: "Count of open support tickets by priority",
    icon: Ticket,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    workspaces: ["cs"],
    category: "metrics",
  },
  "health-distribution": {
    id: "health-distribution",
    name: "Health Distribution",
    description: "Account health scores distribution",
    icon: HeartPulse,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 4 },
    workspaces: ["cs"],
    category: "charts",
  },
  "upcoming-renewals": {
    id: "upcoming-renewals",
    name: "Upcoming Renewals",
    description: "Renewals due in the next 90 days",
    icon: RefreshCw,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
    workspaces: ["cs"],
    category: "lists",
  },
  "at-risk-accounts": {
    id: "at-risk-accounts",
    name: "At-Risk Accounts",
    description: "Accounts with low health scores",
    icon: AlertTriangle,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
    workspaces: ["cs"],
    category: "lists",
  },

  // === MARKETING WIDGETS ===
  "campaign-performance": {
    id: "campaign-performance",
    name: "Campaign Performance",
    description: "Active campaigns with key metrics",
    icon: Megaphone,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
    workspaces: ["marketing"],
    category: "lists",
  },
  "form-submissions": {
    id: "form-submissions",
    name: "Form Submissions",
    description: "Recent form submissions count",
    icon: FileInput,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
    workspaces: ["marketing"],
    category: "metrics",
  },
  "segment-sizes": {
    id: "segment-sizes",
    name: "Segment Sizes",
    description: "Audience segment member counts",
    icon: PieChart,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 4 },
    workspaces: ["marketing"],
    category: "charts",
  },

  // === GLOBAL WIDGETS ===
  "tasks-due-today": {
    id: "tasks-due-today",
    name: "Tasks Due Today",
    description: "Tasks due today across all modules",
    icon: CheckSquare,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
    workspaces: "all",
    category: "lists",
  },
  "recent-activity": {
    id: "recent-activity",
    name: "Recent Activity",
    description: "Latest activities across the workspace",
    icon: Activity,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    workspaces: "all",
    category: "activity",
  },
  "quick-stats": {
    id: "quick-stats",
    name: "Quick Stats",
    description: "Key metrics at a glance",
    icon: BarChart3,
    defaultSize: { w: 6, h: 2 },
    minSize: { w: 4, h: 2 },
    maxSize: { w: 12, h: 3 },
    workspaces: "all",
    category: "metrics",
  },
};

// Get widgets available for a specific workspace
export function getWidgetsForWorkspace(workspace: WorkspaceType): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter(
    (widget) => widget.workspaces === "all" || widget.workspaces.includes(workspace)
  );
}

// Get widget by ID
export function getWidgetById(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[id];
}

// Group widgets by category
export function getWidgetsByCategory(workspace: WorkspaceType): Record<string, WidgetDefinition[]> {
  const widgets = getWidgetsForWorkspace(workspace);
  return widgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, WidgetDefinition[]>);
}

// Default layouts for each workspace
export const DEFAULT_LAYOUTS: Record<WorkspaceType, { i: string; x: number; y: number; w: number; h: number }[]> = {
  sales: [
    { i: "pipeline-value", x: 0, y: 0, w: 3, h: 2 },
    { i: "conversion-rate", x: 3, y: 0, w: 3, h: 2 },
    { i: "quick-stats", x: 6, y: 0, w: 6, h: 2 },
    { i: "leads-by-status", x: 0, y: 2, w: 4, h: 3 },
    { i: "deals-closing", x: 4, y: 2, w: 4, h: 3 },
    { i: "tasks-due-today", x: 8, y: 2, w: 4, h: 3 },
    { i: "recent-activity", x: 0, y: 5, w: 6, h: 4 },
  ],
  cs: [
    { i: "open-tickets", x: 0, y: 0, w: 3, h: 2 },
    { i: "quick-stats", x: 3, y: 0, w: 6, h: 2 },
    { i: "health-distribution", x: 9, y: 0, w: 3, h: 3 },
    { i: "at-risk-accounts", x: 0, y: 2, w: 4, h: 3 },
    { i: "upcoming-renewals", x: 4, y: 2, w: 5, h: 3 },
    { i: "tasks-due-today", x: 0, y: 5, w: 4, h: 3 },
    { i: "recent-activity", x: 4, y: 5, w: 5, h: 4 },
  ],
  marketing: [
    { i: "form-submissions", x: 0, y: 0, w: 3, h: 2 },
    { i: "quick-stats", x: 3, y: 0, w: 6, h: 2 },
    { i: "segment-sizes", x: 9, y: 0, w: 3, h: 3 },
    { i: "campaign-performance", x: 0, y: 2, w: 6, h: 3 },
    { i: "tasks-due-today", x: 6, y: 2, w: 3, h: 3 },
    { i: "recent-activity", x: 0, y: 5, w: 6, h: 4 },
  ],
};
