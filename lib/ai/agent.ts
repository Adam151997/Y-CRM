import { generateText, CoreMessage } from "ai";
import { 
  geminiFlash, 
  geminiPro,
  CRM_SYSTEM_PROMPT, 
  ANALYTICS_SYSTEM_PROMPT,
  isAIConfigured,
  ModelType,
} from "./providers";
import {
  createLeadTool,
  searchLeadsTool,
  updateLeadTool,
  createContactTool,
  searchContactsTool,
  createAccountTool,
  searchAccountsTool,
  createTaskTool,
  completeTaskTool,
  searchTasksTool,
  createOpportunityTool,
  searchOpportunitiesTool,
  createNoteTool,
  getDashboardStatsTool,
  semanticSearchTool,
  searchDocumentsTool,
  getDocumentStatsTool,
  analyzeDocumentTool,
  // Composio Integration Tools
  getConnectedIntegrationsTool,
  sendEmailTool,
  createCalendarEventTool,
  sendSlackMessageTool,
  createGitHubIssueTool,
  executeExternalToolTool,
} from "./tools";
import { createAuditLog } from "@/lib/audit";

export interface AgentContext {
  orgId: string;
  userId: string;
  requestId?: string;
  modelType?: ModelType; // Optional: "fast" (default) or "advanced"
}

export interface AgentResult {
  success: boolean;
  response: string;
  toolsCalled: string[];
  modelUsed: string;
  error?: string;
}

/**
 * Get all available tools for the CRM agent
 */
export function getCRMTools(orgId: string, userId: string) {
  return {
    // Lead tools
    createLead: createLeadTool(orgId, userId),
    searchLeads: searchLeadsTool(orgId),
    updateLead: updateLeadTool(orgId, userId),
    // Contact tools
    createContact: createContactTool(orgId, userId),
    searchContacts: searchContactsTool(orgId),
    // Account tools
    createAccount: createAccountTool(orgId, userId),
    searchAccounts: searchAccountsTool(orgId),
    // Task tools
    createTask: createTaskTool(orgId, userId),
    completeTask: completeTaskTool(orgId, userId),
    searchTasks: searchTasksTool(orgId),
    // Opportunity tools
    createOpportunity: createOpportunityTool(orgId, userId),
    searchOpportunities: searchOpportunitiesTool(orgId),
    // Note tools
    createNote: createNoteTool(orgId, userId),
    // Dashboard tools
    getDashboardStats: getDashboardStatsTool(orgId),
    // Semantic search
    semanticSearch: semanticSearchTool(orgId),
    // Document tools
    searchDocuments: searchDocumentsTool(orgId),
    getDocumentStats: getDocumentStatsTool(orgId),
    analyzeDocument: analyzeDocumentTool(orgId),
    // Composio Integration tools
    getConnectedIntegrations: getConnectedIntegrationsTool(orgId),
    sendEmail: sendEmailTool(orgId),
    createCalendarEvent: createCalendarEventTool(orgId),
    sendSlackMessage: sendSlackMessageTool(orgId),
    createGitHubIssue: createGitHubIssueTool(orgId),
    executeExternalTool: executeExternalToolTool(orgId),
  };
}

/**
 * Detect if the message requires advanced model
 */
function detectAdvancedIntent(message: string): boolean {
  const advancedKeywords = [
    "analyze", "analysis", "report", "insight", "trend",
    "forecast", "predict", "compare", "summary", "breakdown",
    "performance", "metrics", "statistics", "evaluate", "assess",
    "strategy", "recommendation", "why", "how come", "explain why",
    "document stats", "storage used", "analyze document",
  ];
  
  const lowerMessage = message.toLowerCase();
  return advancedKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Execute agent request with tool support
 * Uses Gemini 2.0 Flash by default, Gemini 2.5 Pro for complex tasks
 */
export async function executeAgent(
  messages: CoreMessage[],
  context: AgentContext
): Promise<AgentResult> {
  const { orgId, userId, requestId } = context;
  const toolsCalled: string[] = [];

  // Check if AI is configured
  if (!isAIConfigured()) {
    return {
      success: false,
      response: "AI is not configured. Please add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables.",
      toolsCalled: [],
      modelUsed: "none",
      error: "AI not configured",
    };
  }

  // Determine which model to use
  const lastUserMessage = messages.filter(m => m.role === "user").pop();
  const userContent = typeof lastUserMessage?.content === "string" 
    ? lastUserMessage.content 
    : "";
  
  const useAdvancedModel = context.modelType === "advanced" || detectAdvancedIntent(userContent);
  const model = useAdvancedModel ? geminiPro : geminiFlash;
  const modelName = useAdvancedModel ? "gemini-2.5-pro" : "gemini-2.0-flash";
  const systemPrompt = useAdvancedModel ? ANALYTICS_SYSTEM_PROMPT : CRM_SYSTEM_PROMPT;

  try {
    const tools = getCRMTools(orgId, userId);

    console.log(`[Agent] Starting execution with ${modelName}`);
    console.log("[Agent] Message:", userContent.substring(0, 100));

    const result = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 5,
      onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
        console.log("[Agent] Step finished:", {
          toolCallsCount: toolCalls?.length || 0,
          finishReason,
        });
        
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((tc) => {
            console.log("[Agent] Tool called:", tc.toolName);
            toolsCalled.push(tc.toolName);
          });
        }
      },
    });

    console.log("[Agent] Execution complete:", {
      model: modelName,
      textLength: result.text?.length || 0,
      toolsCalled,
    });

    // Log the AI interaction
    await createAuditLog({
      orgId,
      action: "AI_EXECUTION",
      module: "SYSTEM",
      actorType: "AI_AGENT",
      actorId: userId,
      requestId,
      metadata: {
        model: modelName,
        toolsCalled,
        messageCount: messages.length,
        finishReason: result.finishReason,
      },
    }).catch(console.error);

    return {
      success: true,
      response: result.text || "I processed your request but have no additional response.",
      toolsCalled,
      modelUsed: modelName,
    };
  } catch (error) {
    console.error("[Agent] Execution error:", error);

    await createAuditLog({
      orgId,
      action: "AI_EXECUTION",
      module: "SYSTEM",
      actorType: "AI_AGENT",
      actorId: userId,
      requestId,
      metadata: {
        model: modelName,
        error: error instanceof Error ? error.message : "Unknown error",
        toolsCalled,
      },
    }).catch(console.error);

    return {
      success: false,
      response: `I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
      toolsCalled,
      modelUsed: modelName,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse user intent from natural language
 */
export async function parseIntent(
  userMessage: string,
  context: AgentContext
): Promise<{
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
}> {
  if (!isAIConfigured()) {
    return {
      intent: "UNKNOWN",
      confidence: 0,
      entities: {},
    };
  }

  const intentPrompt = `Analyze this CRM-related message and extract the intent and entities.

Message: "${userMessage}"

Respond with JSON only:
{
  "intent": "CREATE_LEAD" | "UPDATE_LEAD" | "SEARCH_LEADS" | "CREATE_CONTACT" | "CREATE_ACCOUNT" | "CREATE_TASK" | "COMPLETE_TASK" | "CREATE_OPPORTUNITY" | "SEARCH_OPPORTUNITIES" | "GET_STATS" | "GENERATE_REPORT" | "ANALYZE_DATA" | "GENERAL_QUESTION",
  "confidence": 0.0-1.0,
  "entities": {}
}`;

  try {
    const result = await generateText({
      model: geminiFlash, // Always use fast model for intent parsing
      messages: [{ role: "user", content: intentPrompt }],
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Intent parsing error:", error);
  }

  return {
    intent: "GENERAL_QUESTION",
    confidence: 0.5,
    entities: {},
  };
}

/**
 * Generate confirmation message for destructive operations
 */
export function generateConfirmation(
  intent: string,
  entities: Record<string, unknown>
): string | null {
  const destructiveIntents = ["UPDATE_LEAD", "DELETE_LEAD", "COMPLETE_TASK"];

  if (!destructiveIntents.includes(intent)) {
    return null;
  }

  switch (intent) {
    case "UPDATE_LEAD":
      return `I'll update the lead with these changes. Proceed?`;
    case "DELETE_LEAD":
      return `This will permanently delete the lead. Are you sure?`;
    case "COMPLETE_TASK":
      return `I'll mark this task as completed. Confirm?`;
    default:
      return null;
  }
}
