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
  Calendar,
  DollarSign,
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
      { name: "AI Assistant", href: "/sales/assistant", icon: Sparkles, highlight: true, requiresPermission: "ai_assistant" },
      { name: "Leads", href: "/sales/leads", icon: Users, requiresPermission: "leads" },
      { name: "Opportunities", href: "/sales/opportunities", icon: Target, requiresPermission: "opportunities" },
      { name: "Pipeline Board", href: "/sales/pipeline", icon: FolderKanban, requiresPermission: "opportunities" },
      { name: "Contacts", href: "/sales/contacts", icon: UserCircle, requiresPermission: "contacts" },
      { name: "Accounts", href: "/sales/accounts", icon: Building2, requiresPermission: "accounts" },
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
      { name: "AI Assistant", href: "/cs/assistant", icon: Sparkles, highlight: true, requiresPermission: "ai_assistant" },
      { name: "Tickets", href: "/cs/tickets", icon: Ticket, requiresPermission: "tickets" },
      { name: "Health Scores", href: "/cs/health", icon: HeartPulse, requiresPermission: "health_scores" },
      { name: "Renewals", href: "/cs/renewals", icon: RefreshCw, requiresPermission: "renewals" },
      { name: "Accounts", href: "/cs/accounts", icon: Building2, requiresPermission: "accounts" },
      { name: "Playbooks", href: "/cs/playbooks", icon: BookOpen, requiresPermission: "playbooks" },
      { name: "Tasks", href: "/cs/tasks", icon: CheckSquare, requiresPermission: "tasks" },
    ],
  },
];

// Marketing workspace navigation - flat list without section headers
const marketingNavigation: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/marketing", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/marketing/assistant", icon: Sparkles, highlight: true, requiresPermission: "ai_assistant" },
      { name: "Campaigns", href: "/marketing/campaigns", icon: Megaphone, requiresPermission: "campaigns" },
      { name: "Segments", href: "/marketing/segments", icon: UsersRound, requiresPermission: "segments" },
      { name: "Forms", href: "/marketing/forms", icon: FileInput, requiresPermission: "forms" },
    ],
  },
];

// Human Resources workspace navigation - flat list without section headers
const hrNavigation: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/hr", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/hr/assistant", icon: Sparkles, highlight: true, requiresPermission: "ai_assistant" },
      { name: "Employees", href: "/hr/employees", icon: Users, requiresPermission: "employees" },
      { name: "Leaves", href: "/hr/leaves", icon: Calendar, requiresPermission: "leaves" },
      { name: "Payroll", href: "/hr/payroll", icon: DollarSign, requiresPermission: "payroll" },
      { name: "Tasks", href: "/hr/tasks", icon: CheckSquare, requiresPermission: "tasks" },
    ],
  },
];

// Export navigation by workspace
export const WORKSPACE_NAVIGATION: Record<WorkspaceType, NavSection[]> = {
  sales: salesNavigation,
  cs: csNavigation,
  marketing: marketingNavigation,
  hr: hrNavigation,
};

// Get navigation for a workspace
export function getWorkspaceNavigation(workspace: WorkspaceType): NavSection[] {
  return WORKSPACE_NAVIGATION[workspace] || salesNavigation;
}

// Global navigation - available across all workspaces
export const GLOBAL_NAVIGATION: NavItem[] = [
  { name: "Reports", href: "/reports", icon: BarChart3, requiresPermission: "reports" },
];
