/**
 * Composio Apps Configuration
 * Defines available apps for integration
 */

/**
 * Authentication method types
 */
export type AuthMethod = "OAUTH2" | "OAUTH1" | "API_KEY" | "BASIC";

/**
 * App category types
 */
export type AppCategory = 
  | "communication" 
  | "calendar" 
  | "productivity" 
  | "marketing" 
  | "data_enrichment";

/**
 * App configuration
 */
export interface ComposioAppConfig {
  key: string;
  name: string;
  authMethod: AuthMethod;
  category: AppCategory;
  description: string;
  logo: string;
}

/**
 * Available Composio Apps (using Composio defaults - no custom integrationId)
 */
export const COMPOSIO_APPS: ComposioAppConfig[] = [
  // Communication
  {
    key: "gmail",
    name: "Gmail",
    authMethod: "OAUTH2",
    category: "communication",
    description: "Send and manage emails",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/gmail.svg",
  },
  {
    key: "slack",
    name: "Slack",
    authMethod: "OAUTH2",
    category: "communication",
    description: "Send messages to channels and users",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/slack.svg",
  },

  // Calendar
  {
    key: "googlecalendar",
    name: "Google Calendar",
    authMethod: "OAUTH2",
    category: "calendar",
    description: "Create and manage calendar events",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlecalendar.svg",
  },

  // Productivity
  {
    key: "notion",
    name: "Notion",
    authMethod: "OAUTH2",
    category: "productivity",
    description: "Create pages and manage databases",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/notion.svg",
  },
  {
    key: "trello",
    name: "Trello",
    authMethod: "OAUTH1",
    category: "productivity",
    description: "Create cards and manage boards",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/trello.svg",
  },
  {
    key: "asana",
    name: "Asana",
    authMethod: "OAUTH2",
    category: "productivity",
    description: "Create tasks and manage projects",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/asana.svg",
  },

  // Marketing
  {
    key: "mailchimp",
    name: "Mailchimp",
    authMethod: "OAUTH2",
    category: "marketing",
    description: "Manage email marketing campaigns",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/mailchimp.svg",
  },

  // Data Enrichment
  {
    key: "linkedin",
    name: "LinkedIn",
    authMethod: "OAUTH2",
    category: "data_enrichment",
    description: "Search profiles and enrich contact data",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg",
  },
];

/**
 * Category metadata
 */
export const APP_CATEGORIES: Record<AppCategory, { label: string; order: number }> = {
  communication: { label: "Communication", order: 1 },
  calendar: { label: "Calendar", order: 2 },
  productivity: { label: "Productivity", order: 3 },
  marketing: { label: "Marketing", order: 4 },
  data_enrichment: { label: "Data Enrichment", order: 5 },
};

/**
 * Get app by key
 */
export function getAppByKey(key: string): ComposioAppConfig | undefined {
  return COMPOSIO_APPS.find((app) => app.key.toLowerCase() === key.toLowerCase());
}

/**
 * Get apps by category
 */
export function getAppsByCategory(category: AppCategory): ComposioAppConfig[] {
  return COMPOSIO_APPS.filter((app) => app.category === category);
}

/**
 * Get all apps grouped by category
 */
export function getAppsGroupedByCategory(): Record<AppCategory, ComposioAppConfig[]> {
  const grouped: Record<AppCategory, ComposioAppConfig[]> = {
    communication: [],
    calendar: [],
    productivity: [],
    marketing: [],
    data_enrichment: [],
  };

  for (const app of COMPOSIO_APPS) {
    grouped[app.category].push(app);
  }

  return grouped;
}

/**
 * Check if app requires form-based input (API Key, Basic Auth)
 * With Composio defaults, all remaining apps use OAuth
 */
export function requiresFormInput(appKey: string): boolean {
  const app = getAppByKey(appKey);
  if (!app) return false;
  return app.authMethod === "API_KEY" || app.authMethod === "BASIC";
}

/**
 * Get OAuth apps (all remaining apps use OAuth)
 */
export function getOAuthApps(): ComposioAppConfig[] {
  return COMPOSIO_APPS.filter(
    (app) => app.authMethod === "OAUTH2" || app.authMethod === "OAUTH1"
  );
}

/**
 * Get form-based apps (none with current setup)
 */
export function getFormBasedApps(): ComposioAppConfig[] {
  return COMPOSIO_APPS.filter(
    (app) => app.authMethod === "API_KEY" || app.authMethod === "BASIC"
  );
}
