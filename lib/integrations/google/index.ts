/**
 * Google Integration Module
 * Provides unified access to all Google services
 */

// OAuth
export {
  GOOGLE_SCOPES,
  GOOGLE_ADS_SCOPE,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getGoogleUserInfo,
  saveGoogleTokens,
  getValidAccessToken,
  hasGoogleConnection,
  getGoogleConnectionInfo,
  disconnectGoogle,
} from "./oauth";
export type { GoogleTokens, GoogleUserInfo } from "./oauth";

// Gmail
export { GmailClient, createGmailClient } from "./gmail";
export type { EmailMessage, SendEmailParams, EmailSearchParams } from "./gmail";

// Calendar
export { CalendarClient, createCalendarClient } from "./calendar";
export type { CalendarEvent, CreateEventParams, ListEventsParams } from "./calendar";

// Drive
export { DriveClient, createDriveClient } from "./drive";
export type { DriveFile, CreateFileParams, CreateFolderParams, ListFilesParams } from "./drive";

/**
 * Available Google services with one OAuth connection
 */
export const GOOGLE_SERVICES = [
  {
    key: "gmail",
    name: "Gmail",
    description: "Send and manage emails",
    icon: "mail",
  },
  {
    key: "calendar",
    name: "Google Calendar",
    description: "Schedule meetings and events",
    icon: "calendar",
  },
  {
    key: "drive",
    name: "Google Drive",
    description: "Store and share files",
    icon: "hard-drive",
  },
  {
    key: "docs",
    name: "Google Docs",
    description: "Create and edit documents",
    icon: "file-text",
  },
  {
    key: "sheets",
    name: "Google Sheets",
    description: "Create and edit spreadsheets",
    icon: "table",
  },
  {
    key: "meet",
    name: "Google Meet",
    description: "Create video meeting links",
    icon: "video",
  },
];
