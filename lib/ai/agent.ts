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
  // Lead tools
  createLeadTool,
  searchLeadsTool,
  updateLeadTool,
  // Contact tools
  createContactTool,
  searchContactsTool,
  // Account tools
  createAccountTool,
  searchAccountsTool,
  // Task tools
  createTaskTool,
  completeTaskTool,
  searchTasksTool,
  // Opportunity tools
  createOpportunityTool,
  searchOpportunitiesTool,
  // Note tools
  createNoteTool,
  // Dashboard tools
  getDashboardStatsTool,
  // Semantic search
  semanticSearchTool,
  // Document tools
  searchDocumentsTool,
  getDocumentStatsTool,
  analyzeDocumentTool,
  // CS Workspace - Tickets
  createTicketTool,
  searchTicketsTool,
  updateTicketTool,
  addTicketMessageTool,
  // CS Workspace - Health
  getHealthScoreTool,
  searchAtRiskAccountsTool,
  // CS Workspace - Playbooks
  searchPlaybooksTool,
  runPlaybookTool,
  // Marketing Workspace - Campaigns
  createCampaignTool,
  searchCampaignsTool,
  // Marketing Workspace - Segments
  createSegmentTool,
  searchSegmentsTool,
  // Marketing Workspace - Forms
  createFormTool,
  searchFormsTool,
  // Custom Modules
  createCustomModuleTool,
  createCustomFieldTool,
  createCustomModuleRecordTool,
  searchCustomModuleRecordsTool,
  listCustomModulesTool,
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
  modelType?: ModelType;
  workspace?: "sales" | "cs" | "marketing";
}

export interface AgentResult {
  success: boolean;
  response: string;
  toolsCalled: string[];
  toolResults: Record<string, unknown>[];
  modelUsed: string;
  error?: string;
}

/**
 * Get all available tools for the CRM agent
 * Includes tools from all workspaces: Sales, CS, Marketing, and Global
 */
export function getCRMTools(orgId: string, userId: string) {
  return {
    // SALES WORKSPACE TOOLS
    createLead: createLeadTool(orgId, userId),
    searchLeads: searchLeadsTool(orgId),
    updateLead: updateLeadTool(orgId, userId),
    createContact: createContactTool(orgId, userId),
    searchContacts: searchContactsTool(orgId),
    createAccount: createAccountTool(orgId, userId),
    searchAccounts: searchAccountsTool(orgId),
    createOpportunity: createOpportunityTool(orgId, userId),
    searchOpportunities: searchOpportunitiesTool(orgId),

    // CS WORKSPACE TOOLS
    createTicket: createTicketTool(orgId, userId),
    searchTickets: searchTicketsTool(orgId),
    updateTicket: updateTicketTool(orgId, userId),
    addTicketMessage: addTicketMessageTool(orgId, userId),
    getHealthScore: getHealthScoreTool(orgId),
    searchAtRiskAccounts: searchAtRiskAccountsTool(orgId),
    searchPlaybooks: searchPlaybooksTool(orgId),
    runPlaybook: runPlaybookTool(orgId, userId),

    // MARKETING WORKSPACE TOOLS
    createCampaign: createCampaignTool(orgId, userId),
    searchCampaigns: searchCampaignsTool(orgId),
    createSegment: createSegmentTool(orgId, userId),
    searchSegments: searchSegmentsTool(orgId),
    createForm: createFormTool(orgId, userId),
    searchForms: searchFormsTool(orgId),

    // GLOBAL TOOLS (All Workspaces)
    createTask: createTaskTool(orgId, userId),
    completeTask: completeTaskTool(orgId, userId),
    searchTasks: searchTasksTool(orgId),
    createNote: createNoteTool(orgId, userId),
    getDashboardStats: getDashboardStatsTool(orgId),
    semanticSearch: semanticSearchTool(orgId),
    searchDocuments: searchDocumentsTool(orgId),
    getDocumentStats: getDocumentStatsTool(orgId),
    analyzeDocument: analyzeDocumentTool(orgId),

    // CUSTOM MODULE TOOLS
    createCustomModule: createCustomModuleTool(orgId, userId),
    createCustomField: createCustomFieldTool(orgId, userId),
    createCustomModuleRecord: createCustomModuleRecordTool(orgId, userId),
    searchCustomModuleRecords: searchCustomModuleRecordsTool(orgId),
    listCustomModules: listCustomModulesTool(orgId),

    // EXTERNAL INTEGRATION TOOLS (Composio)
    getConnectedIntegrations: getConnectedIntegrationsTool(orgId),
    sendEmail: sendEmailTool(orgId),
    createCalendarEvent: createCalendarEventTool(orgId),
    sendSlackMessage: sendSlackMessageTool(orgId),
    createGitHubIssue: createGitHubIssueTool(orgId),
    executeExternalTool: executeExternalToolTool(orgId),
  };
}

function detectAdvancedIntent(message: string): boolean {
  const advancedKeywords = [
    "analyze", "analysis", "report", "insight", "trend",
    "forecast", "predict", "compare", "summary", "breakdown",
    "performance", "metrics", "statistics", "evaluate", "assess",
    "strategy", "recommendation", "why", "how come", "explain why",
    "health score", "at risk", "churn", "retention",
    "campaign performance", "conversion rate", "roi",
  ];
  
  const lowerMessage = message.toLowerCase();
  return advancedKeywords.some(keyword => lowerMessage.includes(keyword));
}

function detectWorkspace(message: string): "sales" | "cs" | "marketing" | null {
  const lower = message.toLowerCase();
  
  if (lower.includes("ticket") || lower.includes("support") || 
      lower.includes("health score") || lower.includes("playbook") ||
      lower.includes("at risk") || lower.includes("customer success")) {
    return "cs";
  }
  
  if (lower.includes("campaign") || lower.includes("segment") ||
      lower.includes("form") || lower.includes("marketing") ||
      lower.includes("audience") || lower.includes("email blast")) {
    return "marketing";
  }
  
  if (lower.includes("lead") || lower.includes("opportunity") ||
      lower.includes("pipeline") || lower.includes("deal") ||
      lower.includes("sales") || lower.includes("prospect")) {
    return "sales";
  }
  
  return null;
}

/**
 * Detect if the user's message requires tool execution
 * Used to force toolChoice: "required" for clear action requests
 */
function detectToolRequiredIntent(message: string): boolean {
  const lower = message.toLowerCase();
  
  // Action verbs that clearly require tool execution
  const actionVerbs = [
    "create", "add", "make", "new",
    "update", "edit", "change", "modify",
    "delete", "remove",
    "search", "find", "show", "list", "get",
    "complete", "finish", "close",
    "send", "schedule",
  ];
  
  // Entity nouns that indicate CRM operations
  const entityNouns = [
    "lead", "contact", "account", "task", "opportunity",
    "ticket", "note", "campaign", "segment", "form",
    "playbook", "email", "event", "message",
    "dashboard", "stats", "statistics", "report",
  ];
  
  // Check if message contains action verb + entity noun pattern
  const hasActionVerb = actionVerbs.some(verb => lower.includes(verb));
  const hasEntityNoun = entityNouns.some(noun => lower.includes(noun));
  
  return hasActionVerb && hasEntityNoun;
}

export async function executeAgent(
  messages: CoreMessage[],
  context: AgentContext
): Promise<AgentResult> {
  const { orgId, userId, requestId } = context;
  const toolsCalled: string[] = [];
  const toolResults: Record<string, unknown>[] = [];

  if (!isAIConfigured()) {
    return {
      success: false,
      response: "AI is not configured. Please add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables.",
      toolsCalled: [],
      toolResults: [],
      modelUsed: "none",
      error: "AI not configured",
    };
  }

  const lastUserMessage = messages.filter(m => m.role === "user").pop();
  const userContent = typeof lastUserMessage?.content === "string" 
    ? lastUserMessage.content 
    : "";
  
  const useAdvancedModel = context.modelType === "advanced" || detectAdvancedIntent(userContent);
  const model = useAdvancedModel ? geminiPro : geminiFlash;
  const modelName = useAdvancedModel ? "gemini-2.5-pro" : "gemini-2.0-flash";
  const systemPrompt = useAdvancedModel ? ANALYTICS_SYSTEM_PROMPT : CRM_SYSTEM_PROMPT;
  const detectedWorkspace = context.workspace || detectWorkspace(userContent);
  
  // Detect if message requires tool execution
  const requiresToolExecution = detectToolRequiredIntent(userContent);

  try {
    const tools = getCRMTools(orgId, userId);

    console.log(`[Agent] Starting execution with ${modelName}`);
    console.log("[Agent] Context:", { orgId, userId, requestId });
    console.log("[Agent] Workspace:", detectedWorkspace || "auto-detect");
    console.log("[Agent] Message:", userContent.substring(0, 100));
    console.log("[Agent] Available tools:", Object.keys(tools).length);
    console.log("[Agent] Requires tool execution:", requiresToolExecution);

    // Use "required" when we detect clear tool-requiring intent
    // This forces Gemini to actually call tools instead of hallucinating
    const toolChoiceMode = requiresToolExecution ? "required" : "auto";
    console.log("[Agent] Tool choice mode:", toolChoiceMode);

    const result = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools,
      toolChoice: toolChoiceMode as "auto" | "required",
      maxSteps: 5,
      onStepFinish: ({ toolCalls, toolResults: stepToolResults, finishReason, text }) => {
        console.log("[Agent] ====== STEP FINISHED ======");
        console.log("[Agent] Step finishReason:", finishReason);
        console.log("[Agent] Step text preview:", text?.substring(0, 200));
        console.log("[Agent] Step toolCalls:", JSON.stringify(toolCalls || []));
        console.log("[Agent] Step toolResults:", JSON.stringify(stepToolResults || []));
        
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((tc) => {
            console.log("[Agent] Tool called:", tc.toolName, "args:", JSON.stringify(tc.args));
            toolsCalled.push(tc.toolName);
          });
        } else {
          console.log("[Agent] WARNING: No tool calls in this step!");
        }
        
        if (stepToolResults && stepToolResults.length > 0) {
          stepToolResults.forEach((tr) => {
            console.log("[Agent] Tool result:", JSON.stringify(tr));
            if (tr.result && typeof tr.result === 'object') {
              toolResults.push(tr.result as Record<string, unknown>);
            }
          });
        }
      },
    });

    // Log the full result for debugging
    console.log("[Agent] ====== FINAL RESULT ======");
    console.log("[Agent] Result finishReason:", result.finishReason);
    console.log("[Agent] Result text:", result.text?.substring(0, 500));
    console.log("[Agent] Result toolCalls:", JSON.stringify(result.toolCalls || []));
    console.log("[Agent] Result toolResults:", JSON.stringify(result.toolResults || []));
    console.log("[Agent] Total tools called:", toolsCalled);

    await createAuditLog({
      orgId,
      action: "AI_EXECUTION",
      module: "SYSTEM",
      actorType: "AI_AGENT",
      actorId: userId,
      requestId,
      metadata: {
        model: modelName,
        workspace: detectedWorkspace,
        toolsCalled,
        messageCount: messages.length,
        finishReason: result.finishReason,
      },
    }).catch(console.error);

    return {
      success: true,
      response: result.text || "I processed your request but have no additional response.",
      toolsCalled,
      toolResults,
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
        workspace: detectedWorkspace,
        error: error instanceof Error ? error.message : "Unknown error",
        toolsCalled,
      },
    }).catch(console.error);

    return {
      success: false,
      response: `I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
      toolsCalled,
      toolResults,
      modelUsed: modelName,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function parseIntent(
  userMessage: string,
  context: AgentContext
): Promise<{
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
  workspace: string | null;
}> {
  if (!isAIConfigured()) {
    return { intent: "UNKNOWN", confidence: 0, entities: {}, workspace: null };
  }

  const intentPrompt = `Analyze this CRM-related message and extract the intent, entities, and workspace.
Message: "${userMessage}"
Respond with JSON only:
{
  "intent": "CREATE_LEAD" | "UPDATE_LEAD" | "SEARCH_LEADS" | "CREATE_CONTACT" | "CREATE_ACCOUNT" | "CREATE_TASK" | "COMPLETE_TASK" | "CREATE_OPPORTUNITY" | "SEARCH_OPPORTUNITIES" | "CREATE_TICKET" | "SEARCH_TICKETS" | "CREATE_CAMPAIGN" | "SEARCH_CAMPAIGNS" | "GET_STATS" | "GENERATE_REPORT" | "ANALYZE_DATA" | "GENERAL_QUESTION",
  "confidence": 0.0-1.0,
  "entities": {},
  "workspace": "sales" | "cs" | "marketing" | null
}`;

  try {
    const result = await generateText({
      model: geminiFlash,
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
    workspace: detectWorkspace(userMessage),
  };
}

export function generateConfirmation(
  intent: string,
  entities: Record<string, unknown>
): string | null {
  const destructiveIntents = ["UPDATE_LEAD", "DELETE_LEAD", "COMPLETE_TASK", "UPDATE_TICKET"];

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
    case "UPDATE_TICKET":
      return `I'll update the ticket status. Proceed?`;
    default:
      return null;
  }
}
