/**
 * Composio Apps Configuration
 * Defines all supported integrations with their IDs, logos, and categories
 */

export type AuthMethod = "oauth2" | "oauth1" | "api_key" | "basic_jwt";

export interface ComposioAppConfig {
  key: string;
  name: string;
  integrationId: string;
  authMethod: AuthMethod;
  category: AppCategory;
  description: string;
  logo: string; // Composio CDN URL
}

export type AppCategory = 
  | "communication"
  | "calendar"
  | "productivity"
  | "advertising"
  | "marketing"
  | "data_enrichment";

export const APP_CATEGORIES: Record<AppCategory, { label: string; order: number }> = {
  communication: { label: "Communication", order: 1 },
  calendar: { label: "Calendar", order: 2 },
  productivity: { label: "Productivity", order: 3 },
  advertising: { label: "Advertising", order: 4 },
  marketing: { label: "Marketing", order: 5 },
  data_enrichment: { label: "Data Enrichment", order: 6 },
};

/**
 * All supported Composio apps with their configuration
 */
export const COMPOSIO_APPS: ComposioAppConfig[] = [
  // Communication
  {
    key: "gmail",
    name: "Gmail",
    integrationId: "ac_eLrYj7WapQxh",
    authMethod: "oauth2",
    category: "communication",
    description: "Send and manage emails directly from Y CRM",
    logo: "https://cdn.jsdelivr.net/gh/AugustinMauworworworworworworworworwor/logos@main/gmail.svg",
  },
  {
    key: "slack",
    name: "Slack",
    integrationId: "ac_C6tFbqm9IPhO",
    authMethod: "oauth2",
    category: "communication",
    description: "Send messages and notifications to Slack channels",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/slack.svg",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    integrationId: "ac_GgGH7BgGy67z",
    authMethod: "oauth2",
    category: "communication",
    description: "Send WhatsApp messages to contacts and leads",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg",
  },

  // Calendar
  {
    key: "googlecalendar",
    name: "Google Calendar",
    integrationId: "ac_vkiOeY11TwA3",
    authMethod: "oauth2",
    category: "calendar",
    description: "Create and manage calendar events",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlecalendar.svg",
  },

  // Productivity
  {
    key: "notion",
    name: "Notion",
    integrationId: "ac_Rsm8aeItU7Ys",
    authMethod: "oauth2",
    category: "productivity",
    description: "Create pages and manage databases in Notion",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/notion.svg",
  },
  {
    key: "trello",
    name: "Trello",
    integrationId: "ac_Jd20JzALnNkq",
    authMethod: "oauth1",
    category: "productivity",
    description: "Create cards and manage boards in Trello",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/trello.svg",
  },
  {
    key: "asana",
    name: "Asana",
    integrationId: "ac_j8R1N7bcx3GV",
    authMethod: "oauth2",
    category: "productivity",
    description: "Create tasks and manage projects in Asana",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/asana.svg",
  },

  // Advertising
  {
    key: "googleads",
    name: "Google Ads",
    integrationId: "ac_2LIP31zeI4_T",
    authMethod: "oauth2",
    category: "advertising",
    description: "Manage Google Ads campaigns and analytics",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googleads.svg",
  },
  {
    key: "facebookads",
    name: "Meta Ads",
    integrationId: "ac_Q9atL9cpJDrY",
    authMethod: "api_key",
    category: "advertising",
    description: "Manage Facebook and Instagram ad campaigns",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg",
  },

  // Marketing
  {
    key: "mailchimp",
    name: "Mailchimp",
    integrationId: "ac_Yh8Yly9hZmcE",
    authMethod: "oauth2",
    category: "marketing",
    description: "Manage email campaigns and audiences",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/mailchimp.svg",
  },

  // Data Enrichment
  {
    key: "linkedin",
    name: "LinkedIn",
    integrationId: "ac_x0CID2zI9Dfn",
    authMethod: "oauth2",
    category: "data_enrichment",
    description: "Access LinkedIn profiles and company data",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg",
  },
  {
    key: "zoominfo",
    name: "ZoomInfo",
    integrationId: "ac_tuXZZTHQNRtb",
    authMethod: "basic_jwt",
    category: "data_enrichment",
    description: "Enrich contacts and companies with ZoomInfo data",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/zoominfo.svg",
  },
];

/**
 * Get app by key
 */
export function getAppByKey(key: string): ComposioAppConfig | undefined {
  return COMPOSIO_APPS.find((app) => app.key === key);
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
    advertising: [],
    marketing: [],
    data_enrichment: [],
  };

  for (const app of COMPOSIO_APPS) {
    grouped[app.category].push(app);
  }

  return grouped;
}

/**
 * Get apps that require form input (API key, Basic auth)
 */
export function getFormBasedApps(): ComposioAppConfig[] {
  return COMPOSIO_APPS.filter(
    (app) => app.authMethod === "api_key" || app.authMethod === "basic_jwt"
  );
}

/**
 * Get apps that use OAuth flow
 */
export function getOAuthApps(): ComposioAppConfig[] {
  return COMPOSIO_APPS.filter(
    (app) => app.authMethod === "oauth2" || app.authMethod === "oauth1"
  );
}

/**
 * Check if app requires form input
 */
export function requiresFormInput(appKey: string): boolean {
  const app = getAppByKey(appKey);
  return app?.authMethod === "api_key" || app?.authMethod === "basic_jwt";
}
