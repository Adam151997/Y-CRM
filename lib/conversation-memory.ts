/**
 * Redis-based Conversation Memory for AI Agent
 * Maintains context across multiple interactions within a session
 */

import Redis from "ioredis";
import { CoreMessage } from "ai";

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Connection error handling
redis.on("error", (err) => {
  console.error("[ConversationMemory] Redis connection error:", err);
});

/**
 * Entity reference from tool execution
 */
export interface EntityReference {
  type: "LEAD" | "CONTACT" | "ACCOUNT" | "OPPORTUNITY" | "TICKET" | "TASK" | "CAMPAIGN" | "SEGMENT" | "FORM";
  id: string;
  name: string;
  createdAt: number;
}

/**
 * Tool call record
 */
export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  timestamp: number;
}

/**
 * Conversation context stored in Redis
 */
export interface ConversationContext {
  sessionId: string;
  orgId: string;
  userId: string;
  messages: CoreMessage[];
  lastToolCalls: ToolCallRecord[];
  recentEntities: EntityReference[];
  metadata: {
    startedAt: number;
    lastActivityAt: number;
    messageCount: number;
    workspace?: "sales" | "cs" | "marketing";
  };
}

// Constants
const CONVERSATION_TTL = 30 * 60; // 30 minutes
const MAX_MESSAGES = 10;
const MAX_TOOL_CALLS = 5;
const MAX_ENTITIES = 10;

/**
 * Generate Redis key for conversation
 */
function getConversationKey(orgId: string, sessionId: string): string {
  return `conv:${orgId}:${sessionId}`;
}

/**
 * Get conversation context from Redis
 */
export async function getConversationContext(
  orgId: string,
  sessionId: string
): Promise<ConversationContext | null> {
  try {
    const key = getConversationKey(orgId, sessionId);
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }
    
    const context = JSON.parse(data) as ConversationContext;
    console.log(`[ConversationMemory] Loaded context for session ${sessionId}: ${context.metadata.messageCount} messages`);
    
    return context;
  } catch (error) {
    console.error("[ConversationMemory] Error getting context:", error);
    return null;
  }
}

/**
 * Save conversation context to Redis
 */
export async function saveConversationContext(
  orgId: string,
  sessionId: string,
  userId: string,
  updates: {
    messages?: CoreMessage[];
    toolCall?: ToolCallRecord;
    entity?: EntityReference;
    workspace?: "sales" | "cs" | "marketing";
  }
): Promise<ConversationContext | null> {
  try {
    const key = getConversationKey(orgId, sessionId);
    
    // Get existing context or create new
    let context = await getConversationContext(orgId, sessionId);
    
    if (!context) {
      context = {
        sessionId,
        orgId,
        userId,
        messages: [],
        lastToolCalls: [],
        recentEntities: [],
        metadata: {
          startedAt: Date.now(),
          lastActivityAt: Date.now(),
          messageCount: 0,
        },
      };
    }
    
    // Update messages (keep last MAX_MESSAGES)
    if (updates.messages) {
      context.messages = [...context.messages, ...updates.messages].slice(-MAX_MESSAGES);
      context.metadata.messageCount += updates.messages.length;
    }
    
    // Add tool call (keep last MAX_TOOL_CALLS)
    if (updates.toolCall) {
      context.lastToolCalls = [...context.lastToolCalls, updates.toolCall].slice(-MAX_TOOL_CALLS);
    }
    
    // Add entity reference (keep last MAX_ENTITIES)
    if (updates.entity) {
      // Remove duplicate if exists
      context.recentEntities = context.recentEntities.filter(
        e => !(e.type === updates.entity!.type && e.id === updates.entity!.id)
      );
      context.recentEntities = [...context.recentEntities, updates.entity].slice(-MAX_ENTITIES);
    }
    
    // Update workspace if provided
    if (updates.workspace) {
      context.metadata.workspace = updates.workspace;
    }
    
    // Update last activity
    context.metadata.lastActivityAt = Date.now();
    
    // Save to Redis with TTL
    await redis.setex(key, CONVERSATION_TTL, JSON.stringify(context));
    
    console.log(`[ConversationMemory] Saved context for session ${sessionId}`);
    
    return context;
  } catch (error) {
    console.error("[ConversationMemory] Error saving context:", error);
    return null;
  }
}

/**
 * Clear conversation context
 */
export async function clearConversationContext(
  orgId: string,
  sessionId: string
): Promise<boolean> {
  try {
    const key = getConversationKey(orgId, sessionId);
    await redis.del(key);
    console.log(`[ConversationMemory] Cleared context for session ${sessionId}`);
    return true;
  } catch (error) {
    console.error("[ConversationMemory] Error clearing context:", error);
    return false;
  }
}

/**
 * Extract entity references from tool results
 */
export function extractEntityFromToolResult(
  toolName: string,
  result: Record<string, unknown>
): EntityReference | null {
  if (!result.success) return null;
  
  const timestamp = Date.now();
  
  // Map tool names to entity types
  const toolEntityMap: Record<string, { type: EntityReference["type"]; idKey: string; nameKey?: string }> = {
    createLead: { type: "LEAD", idKey: "leadId", nameKey: "message" },
    searchLeads: { type: "LEAD", idKey: "id", nameKey: "name" },
    createContact: { type: "CONTACT", idKey: "contactId", nameKey: "message" },
    searchContacts: { type: "CONTACT", idKey: "id", nameKey: "name" },
    createAccount: { type: "ACCOUNT", idKey: "accountId", nameKey: "message" },
    searchAccounts: { type: "ACCOUNT", idKey: "id", nameKey: "name" },
    createOpportunity: { type: "OPPORTUNITY", idKey: "opportunityId", nameKey: "message" },
    searchOpportunities: { type: "OPPORTUNITY", idKey: "id", nameKey: "name" },
    createTicket: { type: "TICKET", idKey: "ticketId", nameKey: "message" },
    searchTickets: { type: "TICKET", idKey: "id", nameKey: "subject" },
    createTask: { type: "TASK", idKey: "taskId", nameKey: "message" },
    searchTasks: { type: "TASK", idKey: "id", nameKey: "title" },
    createCampaign: { type: "CAMPAIGN", idKey: "campaignId", nameKey: "message" },
    searchCampaigns: { type: "CAMPAIGN", idKey: "id", nameKey: "name" },
    createSegment: { type: "SEGMENT", idKey: "segmentId", nameKey: "message" },
    searchSegments: { type: "SEGMENT", idKey: "id", nameKey: "name" },
    createForm: { type: "FORM", idKey: "formId", nameKey: "message" },
    searchForms: { type: "FORM", idKey: "id", nameKey: "name" },
  };
  
  const mapping = toolEntityMap[toolName];
  if (!mapping) return null;
  
  const id = result[mapping.idKey] as string;
  if (!id) return null;
  
  // Extract name from message or direct field
  let name = "";
  if (mapping.nameKey === "message" && typeof result.message === "string") {
    // Extract name from message like 'Created lead "John Doe" at...'
    const match = result.message.match(/"([^"]+)"/);
    name = match ? match[1] : result.message.substring(0, 50);
  } else if (mapping.nameKey && result[mapping.nameKey]) {
    name = result[mapping.nameKey] as string;
  }
  
  return {
    type: mapping.type,
    id,
    name,
    createdAt: timestamp,
  };
}

/**
 * Build context summary for AI prompt
 */
export function buildContextSummary(context: ConversationContext): string {
  const parts: string[] = [];
  
  // Recent entities
  if (context.recentEntities.length > 0) {
    parts.push("## Recent Records Referenced");
    context.recentEntities.forEach(e => {
      parts.push(`- ${e.type}: "${e.name}" (ID: ${e.id})`);
    });
    parts.push("");
  }
  
  // Current workspace
  if (context.metadata.workspace) {
    parts.push(`Current workspace: ${context.metadata.workspace.toUpperCase()}`);
    parts.push("");
  }
  
  // Recent tool calls summary
  if (context.lastToolCalls.length > 0) {
    parts.push("## Recent Actions");
    context.lastToolCalls.slice(-3).forEach(tc => {
      const resultStatus = (tc.result as { success?: boolean }).success ? "✓" : "✗";
      parts.push(`- ${resultStatus} ${tc.name}`);
    });
    parts.push("");
  }
  
  return parts.join("\n");
}

/**
 * Get all active sessions for an org (for admin/debugging)
 */
export async function getActiveSessionsCount(orgId: string): Promise<number> {
  try {
    const keys = await redis.keys(`conv:${orgId}:*`);
    return keys.length;
  } catch (error) {
    console.error("[ConversationMemory] Error getting session count:", error);
    return 0;
  }
}

/**
 * Extend conversation TTL (call when user is active)
 */
export async function extendConversationTTL(
  orgId: string,
  sessionId: string
): Promise<boolean> {
  try {
    const key = getConversationKey(orgId, sessionId);
    await redis.expire(key, CONVERSATION_TTL);
    return true;
  } catch (error) {
    console.error("[ConversationMemory] Error extending TTL:", error);
    return false;
  }
}
