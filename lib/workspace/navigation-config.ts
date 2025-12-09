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
  LucideIcon,
} from "lucide-react";
import { WorkspaceType } from "./workspace-context";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  highlight?: boolean;
  badge?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// Sales workspace navigation
const salesNavigation: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/sales", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/sales/assistant", icon: Sparkles, highlight: true },
    ],
  },
  {
    title: "Pipeline",
    items: [
      { name: "Leads", href: "/sales/leads", icon: Users },
      { name: "Opportunities", href: "/sales/opportunities", icon: Target },
      { name: "Pipeline Board", href: "/sales/pipeline", icon: FolderKanban },
    ],
  },
  {
    title: "Relationships",
    items: [
      { name: "Contacts", href: "/sales/contacts", icon: UserCircle },
      { name: "Accounts", href: "/sales/accounts", icon: Building2 },
    ],
  },
  {
    title: "Productivity",
    items: [
      { name: "Tasks", href: "/sales/tasks", icon: CheckSquare },
    ],
  },
];

// Customer Success workspace navigation
const csNavigation: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/cs", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/cs/assistant", icon: Sparkles, highlight: true },
    ],
  },
  {
    title: "Support",
    items: [
      { name: "Tickets", href: "/cs/tickets", icon: Ticket },
    ],
  },
  {
    title: "Customer Health",
    items: [
      { name: "Health Scores", href: "/cs/health", icon: HeartPulse },
      { name: "Accounts", href: "/cs/accounts", icon: Building2 },
    ],
  },
  {
    title: "Success Programs",
    items: [
      { name: "Playbooks", href: "/cs/playbooks", icon: BookOpen },
    ],
  },
  {
    title: "Productivity",
    items: [
      { name: "Tasks", href: "/cs/tasks", icon: CheckSquare },
    ],
  },
];

// Marketing workspace navigation
const marketingNavigation: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/marketing", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/marketing/assistant", icon: Sparkles, highlight: true },
    ],
  },
  {
    title: "Campaigns",
    items: [
      { name: "Campaigns", href: "/marketing/campaigns", icon: Megaphone },
    ],
  },
  {
    title: "Audience",
    items: [
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
