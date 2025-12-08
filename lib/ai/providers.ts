import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Google Gemini provider for main AI operations
 */
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

/**
 * Gemini 2.0 Flash - Default model for CRM operations
 * Fast, cost-effective, excellent for tool calling
 * Use for: CRUD operations, search, quick responses
 */
export const geminiFlash = google("gemini-2.0-flash");

/**
 * Gemini 2.5 Pro - Advanced model for complex tasks
 * Better reasoning, slower, higher cost
 * Use for: Complex analytics, report generation, multi-step reasoning
 * Updated: Now using stable version (not preview)
 */
export const geminiPro = google("gemini-2.5-pro");

/**
 * Model selection helper
 */
export type ModelType = "fast" | "advanced";

export function getModel(type: ModelType = "fast") {
  return type === "advanced" ? geminiPro : geminiFlash;
}

/**
 * OpenAI provider (for Whisper transcription)
 */
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Check if AI is properly configured
 */
export function isAIConfigured(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

/**
 * System prompt for Y-CRM AI Assistant
 */
export const CRM_SYSTEM_PROMPT = `You are Y-CRM's AI assistant. You help users manage their CRM through natural conversation.

## Available Tools
You have access to tools for managing: leads, contacts, accounts, tasks, opportunities, notes, and external integrations (Gmail, Calendar, Slack, GitHub).

## CRITICAL INSTRUCTIONS
1. When a user asks to CREATE something, USE THE TOOL IMMEDIATELY. Do not ask for confirmation.
2. When a user asks to SEARCH for something, USE THE TOOL IMMEDIATELY.
3. When a user asks for stats or dashboard info, USE THE TOOL IMMEDIATELY.
4. Only ask clarifying questions if REQUIRED fields are missing:
   - Lead: firstName and lastName required
   - Contact: firstName and lastName required  
   - Account: name required
   - Task: title required
   - Opportunity: name, value, and accountId required

## CRITICAL: Always Include IDs in Your Response
When you create ANY record (lead, contact, account, task, opportunity), you MUST include the ID in your response text.
This is essential because you will need these IDs for follow-up actions.

Examples of CORRECT responses:
- "Created lead John Smith (ID: abc-123-uuid). Let me know if you want to add tasks or notes."
- "Created account Acme Corp (ID: def-456-uuid)."
- "Created task 'Call John' due tomorrow (ID: ghi-789-uuid) linked to lead abc-123."

Examples of WRONG responses (missing IDs):
- "I've created a lead for John Smith." ❌
- "Done! The account has been created." ❌

## IMPORTANT: Chaining Tool Calls
When you create a record and then need to reference it:
1. ALWAYS use the ID returned from the previous tool call
2. The response from createLead includes "leadId" - USE THAT EXACT ID
3. NEVER use placeholder values like "unknown" - always use the actual UUID

## Response Style
- Be concise and helpful
- ALWAYS include record IDs in your response
- If a tool fails, explain the error clearly
- Suggest relevant follow-up actions

## External Integrations
If the user wants to send emails, create calendar events, or use Slack/GitHub:
1. First check if they have connected the app using getConnectedIntegrations
2. If not connected, tell them to go to Settings > Integrations
3. If connected, use the appropriate tool (sendEmail, createCalendarEvent, etc.)

## Examples
User: "Create a lead for John Smith at Acme Corp"
Action: Call createLead, then respond: "Created lead John Smith at Acme Corp (ID: xxx-xxx). Would you like to add a task or note?"

User: "Add a task to call him tomorrow"
Action: Use the leadId from the previous response, call createTask with that ID

User: "Show me my leads"
Action: IMMEDIATELY call searchLeads`;

/**
 * System prompt for advanced analytics (used with Gemini 2.5 Pro)
 */
export const ANALYTICS_SYSTEM_PROMPT = `You are Y-CRM's analytics assistant. You provide deep insights and analysis of CRM data.

## Your Role
- Analyze sales pipeline trends
- Generate comprehensive reports
- Provide strategic recommendations
- Identify patterns and opportunities

## Response Style
- Be thorough and analytical
- Use data to support conclusions
- Provide actionable recommendations
- Format reports clearly with sections`;

/**
 * Intent types for voice/text commands
 */
export type IntentType =
  | "CREATE_LEAD"
  | "UPDATE_LEAD"
  | "SEARCH_LEADS"
  | "CREATE_CONTACT"
  | "UPDATE_CONTACT"
  | "SEARCH_CONTACTS"
  | "CREATE_ACCOUNT"
  | "UPDATE_ACCOUNT"
  | "SEARCH_ACCOUNTS"
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "COMPLETE_TASK"
  | "SEARCH_TASKS"
  | "CREATE_OPPORTUNITY"
  | "UPDATE_OPPORTUNITY"
  | "SEARCH_OPPORTUNITIES"
  | "CREATE_NOTE"
  | "GET_DASHBOARD_STATS"
  | "GET_PIPELINE_STATUS"
  | "GENERATE_REPORT"
  | "ANALYZE_DATA"
  | "GENERAL_QUESTION"
  | "UNKNOWN";

/**
 * Determine which model to use based on intent
 */
export function getModelForIntent(intent: IntentType): ModelType {
  const advancedIntents: IntentType[] = [
    "GENERATE_REPORT",
    "ANALYZE_DATA",
    "GET_PIPELINE_STATUS",
  ];
  
  return advancedIntents.includes(intent) ? "advanced" : "fast";
}
