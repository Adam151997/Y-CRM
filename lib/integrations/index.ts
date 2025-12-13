/**
 * Integrations Module
 * Native OAuth integrations for Google and Slack
 */

// Google Integration
export * from "./google";

// Slack Integration  
export * from "./slack";

/**
 * Available integrations
 */
export const AVAILABLE_INTEGRATIONS = [
  {
    key: "google",
    name: "Google Workspace",
    description: "Gmail, Calendar, Drive, Docs, Sheets, Meet",
    icon: "chrome",
    services: ["Gmail", "Calendar", "Drive", "Docs", "Sheets", "Meet"],
    authType: "oauth2",
  },
  {
    key: "slack",
    name: "Slack",
    description: "Send messages to channels and users",
    icon: "slack",
    services: ["Messaging"],
    authType: "oauth2",
  },
];
