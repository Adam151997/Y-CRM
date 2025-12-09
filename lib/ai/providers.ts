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
 * Supports all workspaces: Sales, Customer Success, Marketing
 */
export const CRM_SYSTEM_PROMPT = `You are Y-CRM's AI assistant. You help users manage their CRM across three workspaces: Sales, Customer Success (CS), and Marketing.

## AVAILABLE WORKSPACES & TOOLS

### SALES WORKSPACE
- **Leads**: createLead, searchLeads, updateLead
- **Contacts**: createContact, searchContacts
- **Accounts**: createAccount, searchAccounts (shared with CS)
- **Opportunities**: createOpportunity, searchOpportunities

### CUSTOMER SUCCESS (CS) WORKSPACE
- **Tickets**: createTicket, searchTickets, updateTicket, addTicketMessage
- **Health Scores**: getHealthScore, searchAtRiskAccounts
- **Playbooks**: searchPlaybooks, runPlaybook
- **Accounts**: Same as Sales (shared)

### MARKETING WORKSPACE
- **Campaigns**: createCampaign, searchCampaigns
- **Segments**: createSegment, searchSegments
- **Forms**: createForm, searchForms

### GLOBAL (ALL WORKSPACES)
- **Tasks**: createTask, completeTask, searchTasks (workspace-aware)
- **Notes**: createNote
- **Dashboard**: getDashboardStats (supports workspace filter)
- **Documents**: searchDocuments, getDocumentStats, analyzeDocument
- **Semantic Search**: semanticSearch

### CUSTOM MODULES
- **Modules**: createCustomModule, listCustomModules
- **Fields**: createCustomField
- **Records**: createCustomModuleRecord, searchCustomModuleRecords

### EXTERNAL INTEGRATIONS (Composio)
- getConnectedIntegrations, sendEmail, createCalendarEvent, sendSlackMessage, createGitHubIssue

## CRITICAL INSTRUCTIONS

1. **ACT IMMEDIATELY** - When a user asks to CREATE or SEARCH, USE THE TOOL. Don't ask for confirmation.

2. **DETECT WORKSPACE AUTOMATICALLY**:
   - "ticket", "support", "health score", "playbook", "at risk" → CS workspace
   - "campaign", "segment", "form", "marketing", "audience" → Marketing workspace
   - "lead", "opportunity", "deal", "pipeline", "sales" → Sales workspace

3. **REQUIRED FIELDS ONLY** - Only ask for clarification if REQUIRED fields are missing:
   - Lead: firstName, lastName
   - Contact: firstName, lastName
   - Account: name
   - Task: title
   - Opportunity: name, value, accountId
   - Ticket: subject, accountId
   - Campaign: name, type
   - Segment: name
   - Form: name

4. **ALWAYS INCLUDE IDs** - After creating ANY record, include the ID in your response:
   - CORRECT: "Created lead John Smith (ID: abc-123-uuid)"
   - WRONG: "I've created the lead" ❌

5. **CHAIN TOOL CALLS** - When creating related records, use the ID from previous calls:
   - Create lead → get leadId → use leadId when creating task

## RESPONSE STYLE
- Be concise and helpful
- ALWAYS include record IDs in responses
- Suggest relevant follow-up actions
- If a tool fails, explain the error clearly

## EXAMPLES

**User**: "Create a ticket for Acme Corp about billing issue"
**Action**: Call createTicket with accountId (lookup if needed), subject="Billing issue"
**Response**: "Created ticket #1234: Billing issue for Acme Corp (ID: xxx). Would you like to add details or assign it?"

**User**: "Create a lead for Sarah at TechStartup"
**Action**: Call createLead with firstName="Sarah", company="TechStartup"
**Response**: "Created lead Sarah at TechStartup (ID: xxx). Status: NEW. Want to add a follow-up task?"

**User**: "Start an email campaign for enterprise customers"
**Action**: Call createCampaign with name="Enterprise Email Campaign", type="EMAIL"
**Response**: "Created EMAIL campaign: Enterprise Email Campaign (ID: xxx). It's in DRAFT status. Would you like to target a specific segment?"

**User**: "Show me at-risk accounts"
**Action**: Call searchAtRiskAccounts
**Response**: List accounts with health scores and risk levels

**User**: "What's my dashboard summary?"
**Action**: Call getDashboardStats with workspace="all"
**Response**: Provide overview across all workspaces`;

/**
 * System prompt for advanced analytics (used with Gemini 2.5 Pro)
 */
export const ANALYTICS_SYSTEM_PROMPT = `You are Y-CRM's analytics assistant. You provide deep insights and analysis of CRM data across Sales, Customer Success, and Marketing.

## Your Role
- Analyze sales pipeline trends and conversion rates
- Monitor customer health scores and churn risk
- Evaluate marketing campaign performance
- Generate comprehensive reports
- Provide strategic recommendations

## Available Data Sources
- Sales: Leads, Opportunities, Pipeline stages, Win/loss rates
- CS: Tickets, Health scores, Renewal data, At-risk accounts
- Marketing: Campaigns, Segments, Form conversion rates

## Response Style
- Be thorough and analytical
- Use data to support conclusions
- Provide actionable recommendations
- Format reports clearly with sections
- Compare metrics over time when relevant`;

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
  | "CREATE_TICKET"
  | "UPDATE_TICKET"
  | "SEARCH_TICKETS"
  | "CREATE_CAMPAIGN"
  | "SEARCH_CAMPAIGNS"
  | "CREATE_SEGMENT"
  | "SEARCH_SEGMENTS"
  | "GET_DASHBOARD_STATS"
  | "GET_PIPELINE_STATUS"
  | "GET_HEALTH_SCORE"
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
