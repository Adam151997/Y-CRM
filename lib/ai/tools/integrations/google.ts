/**
 * Google Integration Tools (Gmail, Calendar)
 */

import { z } from "zod";
import { tool } from "ai";
import { createGmailClient, createCalendarClient, hasGoogleConnection } from "@/lib/integrations/google";
import { hasSlackConnection } from "@/lib/integrations/slack";
import { logToolExecution, handleToolError } from "../helpers";

export function createGoogleTools(orgId: string) {
  return {
    getConnectedIntegrations: getConnectedIntegrationsTool(orgId),
    sendEmail: sendEmailTool(orgId),
    searchEmails: searchEmailsTool(orgId),
    createCalendarEvent: createCalendarEventTool(orgId),
    getUpcomingEvents: getUpcomingEventsTool(orgId),
    getTodayEvents: getTodayEventsTool(orgId),
  };
}

const getConnectedIntegrationsTool = (orgId: string) =>
  tool({
    description: "Get list of connected external integrations like Google (Gmail, Calendar, Drive) and Slack.",
    parameters: z.object({}),
    execute: async () => {
      logToolExecution("getConnectedIntegrations", {});
      try {
        const [googleConnected, slackConnected] = await Promise.all([
          hasGoogleConnection(orgId),
          hasSlackConnection(orgId),
        ]);

        const connectedApps: { name: string; services: string[] }[] = [];

        if (googleConnected) {
          connectedApps.push({
            name: "Google Workspace",
            services: ["Gmail", "Calendar", "Drive", "Docs", "Sheets"],
          });
        }

        if (slackConnected) {
          connectedApps.push({
            name: "Slack",
            services: ["Messaging"],
          });
        }

        return {
          success: true,
          connectedApps,
          message: connectedApps.length > 0
            ? `You have ${connectedApps.length} connected: ${connectedApps.map((a) => a.name).join(", ")}`
            : "No external apps connected. Connect apps in Settings > Integrations.",
        };
      } catch (error) {
        return { ...handleToolError(error, "getConnectedIntegrations"), connectedApps: [] };
      }
    },
  });

const sendEmailTool = (orgId: string) =>
  tool({
    description: "Send an email via Gmail. Requires Google to be connected.",
    parameters: z.object({
      to: z.string().email().describe("Recipient email address"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body"),
      cc: z.string().email().optional(),
    }),
    execute: async ({ to, subject, body, cc }) => {
      logToolExecution("sendEmail", { to, subject });
      try {
        const isConnected = await hasGoogleConnection(orgId);
        if (!isConnected) {
          return { success: false, message: "Google is not connected. Please connect Google in Settings > Integrations." };
        }

        const gmail = createGmailClient(orgId);
        const result = await gmail.sendEmail({ to, subject, body, cc });

        return {
          success: true,
          message: `Email sent successfully to ${to}`,
          messageId: result.id,
        };
      } catch (error) {
        return handleToolError(error, "sendEmail");
      }
    },
  });

const searchEmailsTool = (orgId: string) =>
  tool({
    description: "Search emails in Gmail. Requires Google to be connected.",
    parameters: z.object({
      query: z.string().optional().describe("Search query (Gmail search syntax)"),
      from: z.string().optional().describe("Filter by sender email"),
      maxResults: z.number().min(1).max(20).default(10),
    }),
    execute: async ({ query, from, maxResults }) => {
      logToolExecution("searchEmails", { query, from, maxResults });
      try {
        const isConnected = await hasGoogleConnection(orgId);
        if (!isConnected) {
          return { success: false, message: "Google is not connected. Please connect Google in Settings > Integrations." };
        }

        const gmail = createGmailClient(orgId);
        let searchQuery = query || "";
        if (from) {
          searchQuery = searchQuery ? `${searchQuery} from:${from}` : `from:${from}`;
        }

        const emails = await gmail.listEmails({ query: searchQuery, maxResults });

        return {
          success: true,
          count: emails.length,
          emails: emails.map((e) => ({
            id: e.id,
            subject: e.subject,
            from: e.from,
            date: e.date,
            snippet: e.snippet,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchEmails"), count: 0, emails: [] };
      }
    },
  });

const createCalendarEventTool = (orgId: string) =>
  tool({
    description: "Create a Google Calendar event. Requires Google to be connected.",
    parameters: z.object({
      title: z.string().describe("Event title"),
      description: z.string().optional(),
      startTime: z.string().describe("Start time (ISO format)"),
      endTime: z.string().optional().describe("End time (ISO format, defaults to 1 hour after start)"),
      attendees: z.array(z.string().email()).optional(),
      location: z.string().optional(),
      addMeetLink: z.boolean().default(false).describe("Add Google Meet link"),
    }),
    execute: async ({ title, description, startTime, endTime, attendees, location, addMeetLink }) => {
      logToolExecution("createCalendarEvent", { title, startTime });
      try {
        const isConnected = await hasGoogleConnection(orgId);
        if (!isConnected) {
          return { success: false, message: "Google is not connected. Please connect Google in Settings > Integrations." };
        }

        const calendar = createCalendarClient(orgId);

        // Default end time to 1 hour after start
        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);

        const event = await calendar.createEvent({
          summary: title,
          description,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          attendees,
          location,
          addMeetLink,
        });

        return {
          success: true,
          message: `Calendar event "${title}" created successfully`,
          eventId: event.id,
          meetLink: event.hangoutLink,
          link: event.htmlLink,
        };
      } catch (error) {
        return handleToolError(error, "createCalendarEvent");
      }
    },
  });

const getUpcomingEventsTool = (orgId: string) =>
  tool({
    description: "Get upcoming calendar events. Requires Google to be connected.",
    parameters: z.object({
      days: z.number().min(1).max(30).default(7).describe("Number of days to look ahead"),
    }),
    execute: async ({ days }) => {
      logToolExecution("getUpcomingEvents", { days });
      try {
        const isConnected = await hasGoogleConnection(orgId);
        if (!isConnected) {
          return { success: false, message: "Google is not connected. Please connect Google in Settings > Integrations." };
        }

        const calendar = createCalendarClient(orgId);
        const events = await calendar.getUpcomingEvents(days);

        return {
          success: true,
          count: events.length,
          events: events.map((e) => ({
            id: e.id,
            title: e.summary,
            start: e.start.dateTime || e.start.date,
            end: e.end.dateTime || e.end.date,
            location: e.location,
            meetLink: e.hangoutLink,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "getUpcomingEvents"), count: 0, events: [] };
      }
    },
  });

const getTodayEventsTool = (orgId: string) =>
  tool({
    description: "Get today's calendar events. Requires Google to be connected.",
    parameters: z.object({}),
    execute: async () => {
      logToolExecution("getTodayEvents", {});
      try {
        const isConnected = await hasGoogleConnection(orgId);
        if (!isConnected) {
          return { success: false, message: "Google is not connected. Please connect Google in Settings > Integrations." };
        }

        const calendar = createCalendarClient(orgId);
        const events = await calendar.getTodayEvents();

        return {
          success: true,
          count: events.length,
          events: events.map((e) => ({
            id: e.id,
            title: e.summary,
            start: e.start.dateTime || e.start.date,
            end: e.end.dateTime || e.end.date,
            location: e.location,
            meetLink: e.hangoutLink,
          })),
          message: events.length > 0
            ? `You have ${events.length} events today`
            : "No events scheduled for today",
        };
      } catch (error) {
        return { ...handleToolError(error, "getTodayEvents"), count: 0, events: [] };
      }
    },
  });
