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
You have access to tools for managing: leads, contacts, accounts, tasks, opportunities, and notes.

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

## Response Style
- Be concise and helpful
- After executing a tool, summarize what you did
- If a tool fails, explain the error clearly
- Suggest relevant follow-up actions

## Examples
User: "Create a lead for John Smith at Acme Corp"
Action: IMMEDIATELY call createLead with firstName="John", lastName="Smith", company="Acme Corp"

User: "Show me my leads"
Action: IMMEDIATELY call searchLeads

User: "Add a task to call Bob tomorrow"
Action: IMMEDIATELY call createTask with title="Call Bob", dueDate="tomorrow"`;

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
