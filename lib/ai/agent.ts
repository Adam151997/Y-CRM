import { generateText, CoreMessage } from "ai";
import { 
  geminiPro,
  CRM_SYSTEM_PROMPT, 
  isAIConfigured,
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

/**
 * Get filtered tools based on detected intent
 * This reduces schema complexity for Gemini when using toolChoice: "required"
 * IMPORTANT: Always include relevant search tools with create tools for entity resolution
 */
export function getFilteredTools(
  orgId: string, 
  userId: string, 
  message: string
): Record<string, unknown> {
  const lower = message.toLowerCase();
  const allTools = getCRMTools(orgId, userId);
  
  // Always include these core tools for entity resolution
  const filtered: Record<string, unknown> = {
    getDashboardStats: allTools.getDashboardStats,
    searchTasks: allTools.searchTasks,
    searchAccounts: allTools.searchAccounts, // Always needed for entity resolution
  };
  
  // Lead-related - include search for entity resolution
  if (lower.includes("lead") || lower.includes("prospect")) {
    filtered.createLead = allTools.createLead;
    filtered.searchLeads = allTools.searchLeads;
    filtered.updateLead = allTools.updateLead;
    filtered.createTask = allTools.createTask; // Often need to create follow-up tasks
  }
  
  // Contact-related - include account search for linking
  if (lower.includes("contact")) {
    filtered.createContact = allTools.createContact;
    filtered.searchContacts = allTools.searchContacts;
    filtered.searchAccounts = allTools.searchAccounts;
  }
  
  // Account-related
  if (lower.includes("account") || lower.includes("company") || lower.includes("organization")) {
    filtered.createAccount = allTools.createAccount;
    filtered.searchAccounts = allTools.searchAccounts;
  }
  
  // Opportunity-related - MUST have searchAccounts for accountId resolution
  if (lower.includes("opportunity") || lower.includes("deal") || lower.includes("pipeline")) {
    filtered.createOpportunity = allTools.createOpportunity;
    filtered.searchOpportunities = allTools.searchOpportunities;
    filtered.searchAccounts = allTools.searchAccounts; // Required for accountId
  }
  
  // Task-related - include entity searches for linking
  if (lower.includes("task") || lower.includes("todo") || lower.includes("follow")) {
    filtered.createTask = allTools.createTask;
    filtered.completeTask = allTools.completeTask;
    filtered.searchTasks = allTools.searchTasks;
    filtered.searchLeads = allTools.searchLeads; // For linking to leads
    filtered.searchContacts = allTools.searchContacts; // For linking to contacts
    filtered.searchAccounts = allTools.searchAccounts; // For linking to accounts
  }
  
  // Ticket-related (CS) - MUST have searchAccounts for accountId resolution
  if (lower.includes("ticket") || lower.includes("support") || lower.includes("issue")) {
    filtered.createTicket = allTools.createTicket;
    filtered.searchTickets = allTools.searchTickets;
    filtered.updateTicket = allTools.updateTicket;
    filtered.addTicketMessage = allTools.addTicketMessage;
    filtered.searchAccounts = allTools.searchAccounts; // Required for accountId
    filtered.searchContacts = allTools.searchContacts; // Optional for contactId
  }
  
  // Health score (CS)
  if (lower.includes("health") || lower.includes("risk") || lower.includes("churn")) {
    filtered.getHealthScore = allTools.getHealthScore;
    filtered.searchAtRiskAccounts = allTools.searchAtRiskAccounts;
    filtered.searchAccounts = allTools.searchAccounts;
  }
  
  // Playbook (CS)
  if (lower.includes("playbook")) {
    filtered.searchPlaybooks = allTools.searchPlaybooks;
    filtered.runPlaybook = allTools.runPlaybook;
    filtered.searchAccounts = allTools.searchAccounts; // Required for accountId
  }
  
  // Campaign (Marketing)
  if (lower.includes("campaign")) {
    filtered.createCampaign = allTools.createCampaign;
    filtered.searchCampaigns = allTools.searchCampaigns;
    filtered.searchSegments = allTools.searchSegments; // For segment targeting
  }
  
  // Segment (Marketing)
  if (lower.includes("segment") || lower.includes("audience")) {
    filtered.createSegment = allTools.createSegment;
    filtered.searchSegments = allTools.searchSegments;
  }
  
  // Form (Marketing)
  if (lower.includes("form")) {
    filtered.createForm = allTools.createForm;
    filtered.searchForms = allTools.searchForms;
  }
  
  // Note-related - include entity searches for linking
  if (lower.includes("note")) {
    filtered.createNote = allTools.createNote;
    filtered.searchLeads = allTools.searchLeads;
    filtered.searchContacts = allTools.searchContacts;
    filtered.searchAccounts = allTools.searchAccounts;
    filtered.searchOpportunities = allTools.searchOpportunities;
  }
  
  // Document-related
  if (lower.includes("document") || lower.includes("file")) {
    filtered.searchDocuments = allTools.searchDocuments;
    filtered.getDocumentStats = allTools.getDocumentStats;
    filtered.analyzeDocument = allTools.analyzeDocument;
  }
  
  // Search/find general
  if (lower.includes("search") || lower.includes("find")) {
    filtered.semanticSearch = allTools.semanticSearch;
    filtered.searchLeads = allTools.searchLeads;
    filtered.searchContacts = allTools.searchContacts;
    filtered.searchAccounts = allTools.searchAccounts;
  }
  
  // Stats/dashboard
  if (lower.includes("stat") || lower.includes("dashboard") || lower.includes("overview") || lower.includes("summary")) {
    filtered.getDashboardStats = allTools.getDashboardStats;
  }
  
  // Email
  if (lower.includes("email") || lower.includes("mail")) {
    filtered.sendEmail = allTools.sendEmail;
  }
  
  // Calendar
  if (lower.includes("calendar") || lower.includes("meeting") || lower.includes("schedule")) {
    filtered.createCalendarEvent = allTools.createCalendarEvent;
  }
  
  // If minimal tools detected, return a useful default set
  if (Object.keys(filtered).length <= 3) {
    return {
      getDashboardStats: allTools.getDashboardStats,
      searchLeads: allTools.searchLeads,
      searchContacts: allTools.searchContacts,
      searchAccounts: allTools.searchAccounts,
      searchTasks: allTools.searchTasks,
      createLead: allTools.createLead,
      createTask: allTools.createTask,
      createAccount: allTools.createAccount,
    };
  }
  
  return filtered;
}

/**
 * Detect if the user's message requires tool execution
 */
function detectToolRequiredIntent(message: string): boolean {
  const lower = message.toLowerCase();
  
  const actionVerbs = [
    "create", "add", "make", "new",
    "update", "edit", "change", "modify",
    "delete", "remove",
    "search", "find", "show", "list", "get",
    "complete", "finish", "close",
    "send", "schedule",
  ];
  
  const entityNouns = [
    "lead", "contact", "account", "task", "opportunity",
    "ticket", "note", "campaign", "segment", "form",
    "playbook", "email", "event", "message",
    "dashboard", "stats", "statistics", "report",
  ];
  
  const hasActionVerb = actionVerbs.some(verb => lower.includes(verb));
  const hasEntityNoun = entityNouns.some(noun => lower.includes(noun));
  
  return hasActionVerb && hasEntityNoun;
}

/**
 * Build a response from tool results when model text is empty
 */
function buildResponseFromToolResults(
  toolsCalled: string[],
  toolResults: Record<string, unknown>[]
): string {
  if (toolResults.length === 0) {
    return "I processed your request.";
  }

  const responses: string[] = [];
  
  for (const result of toolResults) {
    if (result.success === false) {
      responses.push(result.message as string || "An operation failed.");
      continue;
    }
    
    // Handle different tool result types
    if (result.message) {
      responses.push(result.message as string);
    } else if (result.leadId) {
      responses.push(`Created lead (ID: ${result.leadId})`);
    } else if (result.contactId) {
      responses.push(`Created contact (ID: ${result.contactId})`);
    } else if (result.accountId) {
      responses.push(`Created account (ID: ${result.accountId})`);
    } else if (result.taskId) {
      responses.push(`Created task (ID: ${result.taskId})`);
    } else if (result.ticketId) {
      responses.push(`Created ticket #${result.ticketNumber || ''} (ID: ${result.ticketId})`);
    } else if (result.opportunityId) {
      responses.push(`Created opportunity (ID: ${result.opportunityId})`);
    } else if (result.campaignId) {
      responses.push(`Created campaign (ID: ${result.campaignId})`);
    } else if (result.count !== undefined) {
      responses.push(`Found ${result.count} results.`);
    } else if (result.stats) {
      responses.push("Retrieved dashboard statistics.");
    }
  }
  
  return responses.length > 0 
    ? responses.join(" ") 
    : "Operation completed successfully.";
}

export async function executeAgent(
  messages: CoreMessage[],
  context: AgentContext
): Promise<AgentResult> {
  const { orgId, userId, requestId } = context;
  const toolsCalled: string[] = [];
  const toolResults: Record<string, unknown>[] = [];
  const modelName = "gemini-2.5-pro";

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
  
  // Detect if message requires tool execution
  const requiresToolExecution = detectToolRequiredIntent(userContent);

  try {
    // Get all tools first
    const allTools = getCRMTools(orgId, userId);
    
    // Use filtered tools when tool execution is required (reduces schema complexity)
    // Use all tools when in "auto" mode for flexibility
    const tools = requiresToolExecution 
      ? getFilteredTools(orgId, userId, userContent)
      : allTools;

    // Use "required" when we detect clear tool-requiring intent
    // This forces Gemini to actually call tools instead of hallucinating
    const toolChoiceMode = requiresToolExecution ? "required" : "auto";

    const result = await generateText({
      model: geminiPro,
      system: CRM_SYSTEM_PROMPT,
      messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      toolChoice: toolChoiceMode as "auto" | "required",
      maxSteps: 3, // Reduced from 5 to prevent duplicate executions
      onStepFinish: ({ toolCalls, toolResults: stepToolResults }) => {
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((tc) => {
            // Prevent duplicate tool calls
            if (!toolsCalled.includes(tc.toolName)) {
              toolsCalled.push(tc.toolName);
            }
          });
        }
        
        if (stepToolResults && stepToolResults.length > 0) {
          stepToolResults.forEach((tr) => {
            if (tr.result && typeof tr.result === 'object') {
              toolResults.push(tr.result as Record<string, unknown>);
            }
          });
        }
      },
    });

    // Build response - use model text if available, otherwise construct from tool results
    let response = result.text;
    if (!response || response.trim() === "") {
      response = buildResponseFromToolResults(toolsCalled, toolResults);
    }

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
    }).catch(() => {}); // Silent fail for audit

    return {
      success: true,
      response,
      toolsCalled,
      toolResults,
      modelUsed: modelName,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await createAuditLog({
      orgId,
      action: "AI_EXECUTION",
      module: "SYSTEM",
      actorType: "AI_AGENT",
      actorId: userId,
      requestId,
      metadata: {
        model: modelName,
        error: errorMessage,
        toolsCalled,
      },
    }).catch(() => {});

    return {
      success: false,
      response: `I encountered an error: ${errorMessage}. Please try again.`,
      toolsCalled,
      toolResults,
      modelUsed: modelName,
      error: errorMessage,
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
      model: geminiPro,
      messages: [{ role: "user", content: intentPrompt }],
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    // Silent fail, return default
  }

  return {
    intent: "GENERAL_QUESTION",
    confidence: 0.5,
    entities: {},
    workspace: null,
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
