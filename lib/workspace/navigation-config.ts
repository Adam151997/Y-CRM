import {
  LayoutDashboard,
  Users,
  Building2,
  UserCircle,
  Target,
  CheckSquare,
  FolderKanban,
  BarChart3,
  Sparkles,
  Ticket,
  HeartPulse,
  BookOpen,
  Megaphone,
  UsersRound,
  FileInput,
  FileText,
  RefreshCw,
  Package,
  LucideIcon,
} from "lucide-react";
import { WorkspaceType } from "./workspace-context";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  highlight?: boolean;
  badge?: string;
  requiresPermission?: string; // Module name for permission check
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// Sales workspace navigation - flat list without section headers
const salesNavigation: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/sales", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/sales/assistant", icon: Sparkles, highlight: true },
      { name: "Leads", href: "/sales/leads", icon: Users },
      { name: "Opportunities", href: "/sales/opportunities", icon: Target },
      { name: "Pipeline Board", href: "/sales/pipeline", icon: FolderKanban },
      { name: "Contacts", href: "/sales/contacts", icon: UserCircle },
      { name: "Accounts", href: "/sales/accounts", icon: Building2 },
      { name: "Invoices", href: "/sales/invoices", icon: FileText, requiresPermission: "invoices" },
      { name: "Inventory", href: "/sales/inventory", icon: Package, requiresPermission: "inventory" },
      { name: "Tasks", href: "/sales/tasks", icon: CheckSquare, requiresPermission: "tasks" },
    ],
  },
];

// Customer Success workspace navigation - flat list without section headers
const csNavigation: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/cs", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/cs/assistant", icon: Sparkles, highlight: true },
      { name: "Tickets", href: "/cs/tickets", icon: Ticket },
      { name: "Health Scores", href: "/cs/health", icon: HeartPulse },
      { name: "Renewals", href: "/cs/renewals", icon: RefreshCw },
      { name: "Accounts", href: "/cs/accounts", icon: Building2 },
      { name: "Playbooks", href: "/cs/playbooks", icon: BookOpen },
      { name: "Tasks", href: "/cs/tasks", icon: CheckSquare },
    ],
  },
];

// Marketing workspace navigation - flat list without section headers
const marketingNavigation: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/marketing", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/marketing/assistant", icon: Sparkles, highlight: true },
      { name: "Campaigns", href: "/marketing/campaigns", icon: Megaphone },
      { name: "Segments", href: "/marketing/segments", icon: UsersRound },
      { name: "Forms", href: "/marketing/forms", icon: FileInput },
    ],
  },
];

// Export navigation by workspace
export const WORKSPACE_NAVIGATION: Record<WorkspaceType, NavSection[]> = {
  sales: salesNavigation,
  cs: csNavigation,
  marketing: marketingNavigation,
};

// Get navigation for a workspace
export function getWorkspaceNavigation(workspace: WorkspaceType): NavSection[] {
  return WORKSPACE_NAVIGATION[workspace] || salesNavigation;
}

// Global navigation - available across all workspaces
export const GLOBAL_NAVIGATION: NavItem[] = [
  { name: "Reports", href: "/reports", icon: BarChart3 },
];
