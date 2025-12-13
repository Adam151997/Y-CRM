/**
 * Slack Integration Module
 */

export {
  SLACK_SCOPES,
  getSlackAuthUrl,
  exchangeSlackCode,
  saveSlackTokens,
  getSlackAccessToken,
  hasSlackConnection,
  getSlackConnectionInfo,
  disconnectSlack,
} from "./oauth";
export type { SlackTokens } from "./oauth";

export { SlackClient, createSlackClient } from "./client";
export type {
  SlackChannel,
  SlackUser,
  SlackMessage,
  SendMessageParams,
} from "./client";
