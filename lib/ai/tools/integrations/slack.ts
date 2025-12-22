/**
 * Slack Integration Tools
 */

import { z } from "zod";
import { tool } from "ai";
import { createSlackClient, hasSlackConnection } from "@/lib/integrations/slack";
import { logToolExecution, handleToolError } from "../helpers";

export function createSlackTools(orgId: string) {
  return {
    sendSlackMessage: sendSlackMessageTool(orgId),
    listSlackChannels: listSlackChannelsTool(orgId),
  };
}

const sendSlackMessageTool = (orgId: string) =>
  tool({
    description: "Send a message to a Slack channel or user. Requires Slack to be connected.",
    parameters: z.object({
      channel: z.string().describe("Channel name (e.g., #general) or channel ID"),
      message: z.string().describe("Message text"),
    }),
    execute: async ({ channel, message }) => {
      logToolExecution("sendSlackMessage", { channel });
      try {
        const isConnected = await hasSlackConnection(orgId);
        if (!isConnected) {
          return { success: false, message: "Slack is not connected. Please connect Slack in Settings > Integrations." };
        }

        const slack = createSlackClient(orgId);
        const result = await slack.sendMessage({ channel, text: message });

        return {
          success: true,
          message: `Message sent to ${channel}`,
          timestamp: result.ts,
        };
      } catch (error) {
        return handleToolError(error, "sendSlackMessage");
      }
    },
  });

const listSlackChannelsTool = (orgId: string) =>
  tool({
    description: "List available Slack channels. Requires Slack to be connected.",
    parameters: z.object({
      limit: z.number().min(1).max(100).default(20),
    }),
    execute: async ({ limit }) => {
      logToolExecution("listSlackChannels", { limit });
      try {
        const isConnected = await hasSlackConnection(orgId);
        if (!isConnected) {
          return { success: false, message: "Slack is not connected. Please connect Slack in Settings > Integrations." };
        }

        const slack = createSlackClient(orgId);
        const channels = await slack.listChannels(limit);

        return {
          success: true,
          count: channels.length,
          channels: channels.map((c) => ({
            id: c.id,
            name: c.name,
            isPrivate: c.is_private,
            memberCount: c.num_members,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "listSlackChannels"), count: 0, channels: [] };
      }
    },
  });
