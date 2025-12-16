import { generateText, CoreMessage } from "ai";
import { 
  geminiPro,
  CRM_SYSTEM_PROMPT, 
  isAIConfigured,
} from "./providers";
import {
  getConversationContext,
  saveConversationContext,
  extractEntityFromToolResult,
  buildContextSummary,
  ToolCallRecord,
} from "@/lib/conversation-memory";
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
  // CS Workspace - Renewals
  createRenewalTool,
  searchRenewalsTool,
  updateRenewalTool,
  getUpcomingRenewalsTool,
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
  // Native Integration Tools (Google & Slack)
  getConnectedIntegrationsTool,
  sendEmailTool,
  searchEmailsTool,
  createCalendarEventTool,
  getUpcomingEventsTool,
  getTodayEventsTool,
  sendSlackMessageTool,
  listSlackChannelsTool,
  // Report Generation
  createReportTool,
} from "./tools";
import { createAuditLog } from "@/lib/audit";
import { createNotification, NotificationType } from "@/lib/notifications";

export interface AgentContext {
  orgId: string;
  userId: string;
  requestId?: string;
  sessionId?: string; // For conversation memory
  workspace?: "sales" | "cs" | "marketing";
}

export interface AgentResult {
  success: boolean;
  response: string;
  toolsCalled: string[];
  toolResults: Record<string, unknown>[];
  modelUsed: string;
  error?: string;
  errorCode?: string; // SCHEMA_COMPLEXITY, RATE_LIMIT, AUTH_ERROR, TIMEOUT, etc.
}

// Primary action types
type PrimaryAction = 
  | "task" | "lead" | "contact" | "account" | "opportunity" 
  | "ticket" | "note" | "campaign" | "segment" | "form" | "renewal"
  | "search" | "stats" | "email" | "calendar" | "slack" | "report" | null;

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
    // CS Workspace - Renewals
    createRenewal: createRenewalTool(orgId, userId),
    searchRenewals: searchRenewalsTool(orgId),
    updateRenewal: updateRenewalTool(orgId, userId),
    getUpcomingRenewals: getUpcomingRenewalsTool(orgId),

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

    // NATIVE INTEGRATION TOOLS (Google & Slack)
    getConnectedIntegrations: getConnectedIntegrationsTool(orgId),
    sendEmail: sendEmailTool(orgId),
    searchEmails: searchEmailsTool(orgId),
    createCalendarEvent: createCalendarEventTool(orgId),
    getUpcomingEvents: getUpcomingEventsTool(orgId),
    getTodayEvents: getTodayEventsTool(orgId),
    sendSlackMessage: sendSlackMessageTool(orgId),
    listSlackChannels: listSlackChannelsTool(orgId),

    // REPORT GENERATION
    createReport: createReportTool(orgId, userId),
  };
}

/**
 * Detect the PRIMARY action the user wants to perform
 * This distinguishes between "create task ON lead" (primary=task) vs "create lead" (primary=lead)
 */
function detectPrimaryAction(message: string): PrimaryAction {
  const lower = message.toLowerCase();
  
  // Check for action + entity patterns (order matters - most specific first)
  // Task patterns
  if (lower.match(/\b(create|add|make|new|set)\s+(a\s+)?(task|todo|reminder|follow[\s-]?up)/)) return "task";
  if (lower.match(/\b(complete|finish|done|close)\s+(the\s+)?(task|todo)/)) return "task";
  
  // Note patterns
  if (lower.match(/\b(create|add|make|write)\s+(a\s+)?(note|comment)/)) return "note";
  
  // Ticket patterns  
  if (lower.match(/\b(create|add|make|new|open)\s+(a\s+)?(ticket|support|issue)/)) return "ticket";
  if (lower.match(/\b(update|close|resolve)\s+(the\s+)?(ticket)/)) return "ticket";
  
  // Lead patterns
  if (lower.match(/\b(create|add|make|new)\s+(a\s+)?(lead|prospect)/)) return "lead";
  if (lower.match(/\b(update|edit|modify)\s+(the\s+)?(lead)/)) return "lead";
  
  // Contact patterns
  if (lower.match(/\b(create|add|make|new)\s+(a\s+)?(contact)/)) return "contact";
  
  // Account patterns
  if (lower.match(/\b(create|add|make|new)\s+(a\s+)?(account|company|organization)/)) return "account";
  
  // Opportunity patterns
  if (lower.match(/\b(create|add|make|new)\s+(a\s+)?(opportunity|deal)/)) return "opportunity";
  
  // Campaign patterns
  if (lower.match(/\b(create|add|make|new|launch)\s+(a\s+)?(campaign)/)) return "campaign";
  
  // Segment patterns
  if (lower.match(/\b(create|add|make|new)\s+(a\s+)?(segment|audience)/)) return "segment";
  
  // Form patterns
  if (lower.match(/\b(create|add|make|new)\s+(a\s+)?(form)/)) return "form";
  
  // Renewal patterns
  if (lower.match(/\b(create|add|make|new|track)\s+(a\s+)?(renewal|contract)/)) return "renewal";
  if (lower.match(/\b(update|edit|modify)\s+(the\s+)?(renewal)/)) return "renewal";
  if (lower.match(/\b(upcoming|expiring)\s+(renewal|contract)/)) return "renewal";
  if (lower.includes("renewal") && !lower.includes("playbook")) return "renewal";
  
  // Search patterns
  if (lower.match(/\b(search|find|show|list|get)\s/)) return "search";
  
  // Report patterns
  if (lower.match(/\b(generate|create|build|make)\s+(a\s+)?(report|analysis)/)) return "report";
  if (lower.match(/\breport\s+(on|for|about)/)) return "report";
  
  // Stats patterns
  if (lower.match(/\b(dashboard|stats|statistics|overview|summary)/)) return "stats";
  
  // Email patterns
  if (lower.match(/\b(send|compose|write)\s+(an?\s+)?(email|mail)/)) return "email";
  
  // Calendar patterns
  if (lower.match(/\b(schedule|create|add)\s+(a\s+)?(meeting|event|calendar)/)) return "calendar";
  
  // Slack patterns
  if (lower.match(/\b(send|post)\s+(a\s+)?(slack|message\s+to\s+slack)/)) return "slack";
  if (lower.includes("slack")) return "slack";
  
  return null;
}

/**
 * Get filtered tools based on PRIMARY action
 * Only includes the CREATE tool for the primary action
 * Other entities get SEARCH tools only (for entity resolution)
 */
export function getFilteredTools(
  orgId: string, 
  userId: string, 
  message: string,
  primaryAction: PrimaryAction
): Record<string, unknown> {
  const allTools = getCRMTools(orgId, userId);
  const filtered: Record<string, unknown> = {};
  
  // Based on primary action, add the CREATE tool and relevant SEARCH tools
  switch (primaryAction) {
    case "task":
      filtered.createTask = allTools.createTask;
      filtered.completeTask = allTools.completeTask;
      filtered.searchTasks = allTools.searchTasks;
      // Search tools for entity resolution (NO create tools for other entities)
      filtered.searchLeads = allTools.searchLeads;
      filtered.searchContacts = allTools.searchContacts;
      filtered.searchAccounts = allTools.searchAccounts;
      filtered.searchOpportunities = allTools.searchOpportunities;
      break;
      
    case "lead":
      filtered.createLead = allTools.createLead;
      filtered.searchLeads = allTools.searchLeads;
      filtered.updateLead = allTools.updateLead;
      // Removed createTask - only add if explicitly requested
      break;
      
    case "contact":
      filtered.createContact = allTools.createContact;
      filtered.searchContacts = allTools.searchContacts;
      filtered.searchAccounts = allTools.searchAccounts; // For linking
      break;
      
    case "account":
      filtered.createAccount = allTools.createAccount;
      filtered.searchAccounts = allTools.searchAccounts;
      break;
      
    case "opportunity":
      filtered.createOpportunity = allTools.createOpportunity;
      filtered.searchOpportunities = allTools.searchOpportunities;
      filtered.searchAccounts = allTools.searchAccounts; // Required for accountId
      break;
      
    case "ticket":
      filtered.createTicket = allTools.createTicket;
      filtered.searchTickets = allTools.searchTickets;
      filtered.updateTicket = allTools.updateTicket;
      filtered.addTicketMessage = allTools.addTicketMessage;
      filtered.searchAccounts = allTools.searchAccounts; // Required for accountId
      filtered.searchContacts = allTools.searchContacts; // Optional for contactId
      break;
      
    case "note":
      filtered.createNote = allTools.createNote;
      // Search tools for entity resolution
      filtered.searchLeads = allTools.searchLeads;
      filtered.searchContacts = allTools.searchContacts;
      filtered.searchAccounts = allTools.searchAccounts;
      filtered.searchOpportunities = allTools.searchOpportunities;
      break;
      
    case "campaign":
      filtered.createCampaign = allTools.createCampaign;
      filtered.searchCampaigns = allTools.searchCampaigns;
      filtered.searchSegments = allTools.searchSegments;
      break;
      
    case "segment":
      filtered.createSegment = allTools.createSegment;
      filtered.searchSegments = allTools.searchSegments;
      break;
      
    case "form":
      filtered.createForm = allTools.createForm;
      filtered.searchForms = allTools.searchForms;
      break;
      
    case "renewal":
      filtered.createRenewal = allTools.createRenewal;
      filtered.searchRenewals = allTools.searchRenewals;
      filtered.updateRenewal = allTools.updateRenewal;
      filtered.getUpcomingRenewals = allTools.getUpcomingRenewals;
      filtered.searchAccounts = allTools.searchAccounts; // Required for accountId
      break;
      
    case "search":
      filtered.searchLeads = allTools.searchLeads;
      filtered.searchContacts = allTools.searchContacts;
      filtered.searchAccounts = allTools.searchAccounts;
      filtered.searchTasks = allTools.searchTasks;
      filtered.searchOpportunities = allTools.searchOpportunities;
      filtered.searchTickets = allTools.searchTickets;
      filtered.searchRenewals = allTools.searchRenewals;
      filtered.semanticSearch = allTools.semanticSearch;
      break;
      
    case "stats":
      filtered.getDashboardStats = allTools.getDashboardStats;
      break;
      
    case "email":
      filtered.sendEmail = allTools.sendEmail;
      filtered.searchEmails = allTools.searchEmails;
      filtered.searchContacts = allTools.searchContacts;
      filtered.searchLeads = allTools.searchLeads;
      break;
      
    case "calendar":
      filtered.createCalendarEvent = allTools.createCalendarEvent;
      filtered.getUpcomingEvents = allTools.getUpcomingEvents;
      filtered.getTodayEvents = allTools.getTodayEvents;
      filtered.searchContacts = allTools.searchContacts;
      break;
      
    case "slack":
      filtered.sendSlackMessage = allTools.sendSlackMessage;
      filtered.listSlackChannels = allTools.listSlackChannels;
      break;
      
    case "report":
      filtered.createReport = allTools.createReport;
      filtered.getDashboardStats = allTools.getDashboardStats;
      break;
      
    default:
      // Default set for unknown intents
      filtered.getDashboardStats = allTools.getDashboardStats;
      filtered.searchLeads = allTools.searchLeads;
      filtered.searchContacts = allTools.searchContacts;
      filtered.searchAccounts = allTools.searchAccounts;
      filtered.searchTasks = allTools.searchTasks;
      break;
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
    "send", "schedule", "enrich", "lookup",
  ];
  
  const entityNouns = [
    "lead", "contact", "account", "task", "opportunity",
    "ticket", "note", "campaign", "segment", "form",
    "playbook", "email", "event", "message", "renewal", "contract",
    "dashboard", "stats", "statistics", "report", "analysis",
    // Native integrations
    "gmail", "slack", "calendar", "google",
  ];
  
  const hasActionVerb = actionVerbs.some(verb => lower.includes(verb));
  const hasEntityNoun = entityNouns.some(noun => lower.includes(noun));
  
  return hasActionVerb && hasEntityNoun;
}

/**
 * Create notifications from tool results
 */
async function createNotificationsFromResults(
  orgId: string,
  userId: string,
  toolResults: Record<string, unknown>[]
): Promise<void> {
  for (const result of toolResults) {
    if (result.success === false) continue;

    try {
      // Create notification based on result type
      if (result.leadId) {
        await createNotification({
          orgId,
          userId,
          type: "LEAD_CREATED" as NotificationType,
          title: result.message as string || "New lead created",
          entityType: "LEAD",
          entityId: result.leadId as string,
        });
      } else if (result.contactId && !result.count) {
        await createNotification({
          orgId,
          userId,
          type: "CONTACT_CREATED" as NotificationType,
          title: result.message as string || "New contact created",
          entityType: "CONTACT",
          entityId: result.contactId as string,
        });
      } else if (result.accountId && !result.count) {
        await createNotification({
          orgId,
          userId,
          type: "ACCOUNT_CREATED" as NotificationType,
          title: result.message as string || "New account created",
          entityType: "ACCOUNT",
          entityId: result.accountId as string,
        });
      } else if (result.taskId) {
        await createNotification({
          orgId,
          userId,
          type: "TASK_CREATED" as NotificationType,
          title: result.message as string || "New task created",
          entityType: "TASK",
          entityId: result.taskId as string,
        });
      } else if (result.opportunityId && !result.count) {
        await createNotification({
          orgId,
          userId,
          type: "OPPORTUNITY_CREATED" as NotificationType,
          title: result.message as string || "New opportunity created",
          entityType: "OPPORTUNITY",
          entityId: result.opportunityId as string,
        });
      } else if (result.ticketId) {
        await createNotification({
          orgId,
          userId,
          type: "TICKET_CREATED" as NotificationType,
          title: result.message as string || `Ticket #${result.ticketNumber || ''} created`,
          entityType: "TICKET",
          entityId: result.ticketId as string,
        });
      } else if (result.renewalId) {
        await createNotification({
          orgId,
          userId,
          type: "RENEWAL_CREATED" as NotificationType,
          title: result.message as string || "Renewal tracked",
          entityType: "RENEWAL",
          entityId: result.renewalId as string,
        });
      } else if (result.campaignId && !result.count) {
        await createNotification({
          orgId,
          userId,
          type: "CAMPAIGN_CREATED" as NotificationType,
          title: result.message as string || "Campaign created",
          entityType: "CAMPAIGN",
          entityId: result.campaignId as string,
        });
      } else if (result.recordId && result.moduleName) {
        await createNotification({
          orgId,
          userId,
          type: "CUSTOM_RECORD_CREATED" as NotificationType,
          title: result.message as string || `${result.moduleName} record created`,
          entityType: "CUSTOM_MODULE",
          entityId: result.recordId as string,
          metadata: { moduleName: result.moduleName },
        });
      }
    } catch (error) {
      // Silent fail for notifications
      console.error("[Agent] Failed to create notification:", error);
    }
  }
}

/**
 * Build a response from tool results when model text is empty
 * Only shows results relevant to the primary action
 */
function buildResponseFromToolResults(
  primaryAction: PrimaryAction,
  toolResults: Record<string, unknown>[]
): string {
  if (toolResults.length === 0) {
    return "I processed your request.";
  }

  const responses: string[] = [];
  
  for (const result of toolResults) {
    // Skip failures unless they're for the primary action
    if (result.success === false) {
      const message = result.message as string || "";
      // Only show error if it's related to the primary action
      const isPrimaryActionError = 
        (primaryAction === "task" && message.toLowerCase().includes("task")) ||
        (primaryAction === "lead" && message.toLowerCase().includes("lead")) ||
        (primaryAction === "contact" && message.toLowerCase().includes("contact")) ||
        (primaryAction === "account" && message.toLowerCase().includes("account")) ||
        (primaryAction === "ticket" && message.toLowerCase().includes("ticket")) ||
        (primaryAction === "note" && message.toLowerCase().includes("note")) ||
        (primaryAction === "opportunity" && message.toLowerCase().includes("opportunity"));
      
      if (isPrimaryActionError) {
        responses.push(message);
      }
      continue;
    }
    
    // Handle successful results
    if (result.message && typeof result.message === "string") {
      // Filter out "Found 0 results" for search operations that were just for entity resolution
      if (result.message.includes("Found 0") && primaryAction !== "search") {
        continue; // Skip this result
      }
      responses.push(result.message);
    } else if (result.taskId && primaryAction === "task") {
      responses.push(`Created task (ID: ${result.taskId})`);
    } else if (result.leadId && primaryAction === "lead") {
      responses.push(`Created lead (ID: ${result.leadId})`);
    } else if (result.contactId && primaryAction === "contact") {
      responses.push(`Created contact (ID: ${result.contactId})`);
    } else if (result.accountId && primaryAction === "account") {
      responses.push(`Created account (ID: ${result.accountId})`);
    } else if (result.ticketId && primaryAction === "ticket") {
      responses.push(`Created ticket #${result.ticketNumber || ''} (ID: ${result.ticketId})`);
    } else if (result.opportunityId && primaryAction === "opportunity") {
      responses.push(`Created opportunity (ID: ${result.opportunityId})`);
    } else if (result.campaignId && primaryAction === "campaign") {
      responses.push(`Created campaign (ID: ${result.campaignId})`);
    } else if (result.noteId && primaryAction === "note") {
      responses.push(`Added note (ID: ${result.noteId})`);
    } else if (result.stats && primaryAction === "stats") {
      responses.push("Retrieved dashboard statistics.");
    } else if (result.count !== undefined && primaryAction === "search") {
      responses.push(`Found ${result.count} results.`);
    } else if (result.documentId && result.reportContent && primaryAction === "report") {
      responses.push(`Generated report (Document ID: ${result.documentId})`);
    }
  }
  
  // If no responses collected, provide a generic success message
  if (responses.length === 0) {
    return "Action completed successfully.";
  }
  
  // Remove duplicates and join
  const uniqueResponses = Array.from(new Set(responses));
  return uniqueResponses.join(" ");
}

export async function executeAgent(
  messages: CoreMessage[],
  context: AgentContext
): Promise<AgentResult> {
  const { orgId, userId, requestId, sessionId, workspace } = context;
  const toolsCalled: string[] = [];
  const toolResults: Record<string, unknown>[] = [];
  const executedCallHashes = new Set<string>(); // Track executed tool+args to prevent duplicates
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
  
  // Detect primary action and whether tool execution is required
  const primaryAction = detectPrimaryAction(userContent);
  const requiresToolExecution = detectToolRequiredIntent(userContent);

  // Load conversation context from Redis if sessionId provided
  let conversationContext: Awaited<ReturnType<typeof getConversationContext>> = null;
  let contextSummary = "";
  
  if (sessionId) {
    try {
      conversationContext = await getConversationContext(orgId, sessionId);
      if (conversationContext) {
        contextSummary = buildContextSummary(conversationContext);
        console.log(`[Agent] Loaded conversation context: ${conversationContext.metadata.messageCount} previous messages`);
      }
    } catch (error) {
      console.error("[Agent] Error loading conversation context:", error);
    }
  }

  // Build enhanced system prompt with conversation context
  const enhancedSystemPrompt = contextSummary 
    ? `${CRM_SYSTEM_PROMPT}\n\n## CONVERSATION CONTEXT\n${contextSummary}`
    : CRM_SYSTEM_PROMPT;

  try {
    // Get filtered tools based on primary action
    const tools = requiresToolExecution && primaryAction
      ? getFilteredTools(orgId, userId, userContent, primaryAction)
      : getCRMTools(orgId, userId);

    // Use "required" when we detect clear tool-requiring intent
    const toolChoiceMode = requiresToolExecution ? "required" : "auto";

    const result = await generateText({
      model: geminiPro,
      system: enhancedSystemPrompt,
      messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      toolChoice: toolChoiceMode as "auto" | "required",
      maxSteps: 1, // Single step - tool-level resolution handles entity lookups internally
      onStepFinish: ({ toolCalls, toolResults: stepToolResults }) => {
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((tc) => {
            // Create hash of tool name + args to detect duplicates
            const callHash = `${tc.toolName}:${JSON.stringify(tc.args)}`;
            
            // Only track if not already executed
            if (!executedCallHashes.has(callHash)) {
              executedCallHashes.add(callHash);
              if (!toolsCalled.includes(tc.toolName)) {
                toolsCalled.push(tc.toolName);
              }
            }
          });
        }
        
        if (stepToolResults && stepToolResults.length > 0) {
          stepToolResults.forEach((tr) => {
            if (tr.result && typeof tr.result === 'object') {
              // Check for duplicate results
              const resultHash = JSON.stringify(tr.result);
              const isDuplicate = toolResults.some(
                existing => JSON.stringify(existing) === resultHash
              );
              if (!isDuplicate) {
                toolResults.push(tr.result as Record<string, unknown>);
              }
            }
          });
        }
      },
    });

    // Build response - use model text if available, otherwise construct from tool results
    let response = result.text;
    if (!response || response.trim() === "") {
      response = buildResponseFromToolResults(primaryAction, toolResults);
    }

    // Save conversation context to Redis
    if (sessionId) {
      try {
        // Save the user message and assistant response
        const newMessages: CoreMessage[] = [
          { role: "user", content: userContent },
          { role: "assistant", content: response },
        ];

        // Extract entities from tool results
        for (const tr of toolResults) {
          for (const toolName of toolsCalled) {
            const entity = extractEntityFromToolResult(toolName, tr);
            if (entity) {
              await saveConversationContext(orgId, sessionId, userId, { entity });
            }
          }
        }

        // Save messages and tool calls
        const toolCallRecords: ToolCallRecord[] = toolsCalled.map((name, idx) => ({
          name,
          args: {},
          result: toolResults[idx] || {},
          timestamp: Date.now(),
        }));

        for (const tc of toolCallRecords) {
          await saveConversationContext(orgId, sessionId, userId, { toolCall: tc });
        }

        await saveConversationContext(orgId, sessionId, userId, {
          messages: newMessages,
          workspace: workspace || (primaryAction === "ticket" ? "cs" : primaryAction === "campaign" ? "marketing" : "sales"),
        });

        console.log(`[Agent] Saved conversation context for session ${sessionId}`);
      } catch (error) {
        console.error("[Agent] Error saving conversation context:", error);
      }
    }

    // Create notifications for successful actions
    await createNotificationsFromResults(orgId, userId, toolResults).catch(() => {});

    await createAuditLog({
      orgId,
      action: "AI_EXECUTION",
      module: "SYSTEM",
      actorType: "AI_AGENT",
      actorId: userId,
      requestId,
      metadata: {
        model: modelName,
        primaryAction,
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
    
    // Detect Gemini schema complexity errors and provide user-friendly message
    let userFriendlyResponse: string;
    let errorCode: string | undefined;
    
    if (errorMessage.includes("too many states for serving") || 
        errorMessage.includes("schema produces a constraint")) {
      userFriendlyResponse = "I couldn't process that request due to its complexity. Please try a simpler request or break it into smaller steps.";
      errorCode = "SCHEMA_COMPLEXITY";
      console.error("[Agent] Schema complexity error - tools may need simplification");
    } else if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
      userFriendlyResponse = "I'm currently experiencing high demand. Please try again in a moment.";
      errorCode = "RATE_LIMIT";
    } else if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
      userFriendlyResponse = "There's a configuration issue with the AI service. Please contact support.";
      errorCode = "AUTH_ERROR";
    } else if (errorMessage.includes("timeout") || errorMessage.includes("DEADLINE_EXCEEDED")) {
      userFriendlyResponse = "The request took too long to process. Please try a simpler request.";
      errorCode = "TIMEOUT";
    } else {
      userFriendlyResponse = "I encountered an issue processing your request. Please try again or rephrase your request.";
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
        primaryAction,
        error: errorMessage,
        errorCode,
        toolsCalled,
      },
    }).catch(() => {});

    return {
      success: false,
      response: userFriendlyResponse,
      toolsCalled,
      toolResults,
      modelUsed: modelName,
      error: errorMessage,
      errorCode,
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
  } catch {
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
  intent: string
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
