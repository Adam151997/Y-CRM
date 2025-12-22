/**
 * Complexity Analyzer for Multi-Step Execution
 *
 * Analyzes user intent to determine optimal maxSteps for the agent.
 * Simple actions get 1 step, complex multi-step workflows get more.
 */

export type IntentComplexity = "simple" | "moderate" | "complex";

export interface ComplexityAnalysis {
  complexity: IntentComplexity;
  maxSteps: number;
  requiresEntityResolution: boolean;
  estimatedToolCalls: number;
  detectedActions: string[];
  reasoning: string;
}

/**
 * Patterns that indicate entity resolution is needed
 */
const ENTITY_RESOLUTION_PATTERNS = [
  /\bfor\s+(?:the\s+)?(?:company|account|client)\s+["']?[\w\s]+["']?/i,
  /\bfor\s+["']?[\w\s]+["']?\s*(?:account|company)/i,
  /\b(?:on|to|from)\s+(?:the\s+)?(?:lead|contact|account|opportunity)\s+/i,
  /\b(?:acme|tech|corp|inc|company|org)\b/i, // Common company name patterns
  /\bfor\s+(?:[\w]+\s+){1,3}(?:lead|contact|opportunity)/i,
];

/**
 * Patterns that indicate multiple actions (AND, THEN, ALSO)
 */
const MULTI_ACTION_PATTERNS = [
  /\b(?:and\s+(?:then\s+)?(?:also\s+)?(?:create|add|make|send|schedule))/i,
  /\bthen\s+(?:create|add|make|send|schedule)/i,
  /\balso\s+(?:create|add|make|send|schedule)/i,
  /\b(?:create|add)\s+(?:a\s+)?(?:\w+)\s+(?:and|then)\s+(?:a\s+)?(?:\w+)/i,
  /,\s*(?:and\s+)?(?:create|add|send|schedule)/i,
];

/**
 * Simple action patterns (single step)
 */
const SIMPLE_ACTION_PATTERNS = [
  /^(?:search|find|get|show|list)\s+/i,
  /^what\s+(?:is|are)/i,
  /^how\s+many/i,
  /^(?:complete|close|mark)\s+(?:the\s+)?task/i,
];

/**
 * Action verbs for counting actions
 */
const ACTION_VERBS = [
  "create",
  "add",
  "make",
  "update",
  "edit",
  "modify",
  "send",
  "schedule",
  "complete",
  "close",
  "search",
  "find",
  "get",
  "generate",
];

/**
 * Analyze the complexity of a user's message
 */
export function analyzeIntentComplexity(message: string): ComplexityAnalysis {
  const lower = message.toLowerCase();

  // Check for simple patterns first
  const isSimple = SIMPLE_ACTION_PATTERNS.some((p) => p.test(lower));
  if (isSimple) {
    return {
      complexity: "simple",
      maxSteps: 1,
      requiresEntityResolution: false,
      estimatedToolCalls: 1,
      detectedActions: extractActions(lower),
      reasoning: "Simple search or query operation",
    };
  }

  // Check if entity resolution is needed
  const requiresEntityResolution = ENTITY_RESOLUTION_PATTERNS.some((p) =>
    p.test(lower)
  );

  // Check for multiple actions
  const hasMultipleActions = MULTI_ACTION_PATTERNS.some((p) => p.test(lower));

  // Count distinct actions
  const detectedActions = extractActions(lower);
  const actionCount = detectedActions.length;

  // Determine complexity
  let complexity: IntentComplexity;
  let maxSteps: number;
  let reasoning: string;

  if (hasMultipleActions || actionCount > 1) {
    complexity = "complex";
    maxSteps = 5;
    reasoning = `Multiple actions detected: ${detectedActions.join(", ")}`;
  } else if (requiresEntityResolution) {
    complexity = "moderate";
    maxSteps = 3;
    reasoning = "Requires entity resolution before main action";
  } else if (actionCount === 1) {
    complexity = "simple";
    maxSteps = 1;
    reasoning = `Single action: ${detectedActions[0] || "unknown"}`;
  } else {
    // Default case
    complexity = "simple";
    maxSteps = 1;
    reasoning = "General query or simple operation";
  }

  // Calculate estimated tool calls
  let estimatedToolCalls = actionCount;
  if (requiresEntityResolution) {
    estimatedToolCalls += 1; // Add one for the search
  }

  return {
    complexity,
    maxSteps,
    requiresEntityResolution,
    estimatedToolCalls,
    detectedActions,
    reasoning,
  };
}

/**
 * Extract action verbs from the message
 */
function extractActions(message: string): string[] {
  const actions: string[] = [];
  const words = message.split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z]/gi, "").toLowerCase();
    if (ACTION_VERBS.includes(word)) {
      // Get the next word for context (e.g., "create lead")
      const nextWord = words[i + 1]?.replace(/[^a-z]/gi, "").toLowerCase();
      if (nextWord && !ACTION_VERBS.includes(nextWord)) {
        actions.push(`${word} ${nextWord}`);
      } else {
        actions.push(word);
      }
    }
  }

  // Remove duplicates
  return Array.from(new Set(actions));
}

/**
 * Get step limit based on primary action type
 * Used as fallback when complexity analysis is inconclusive
 */
export function getStepLimitForAction(
  primaryAction: string | null
): number {
  if (!primaryAction) return 1;

  // Actions that typically need entity resolution
  const needsResolution = [
    "ticket",
    "task",
    "note",
    "opportunity",
    "renewal",
  ];

  if (needsResolution.includes(primaryAction)) {
    return 3; // Allow for: search entity + create linked record + (optional follow-up)
  }

  // Simple actions
  const simpleActions = ["search", "stats", "email", "slack"];
  if (simpleActions.includes(primaryAction)) {
    return 1;
  }

  // Default for create/update actions
  return 2;
}

/**
 * Check if the message indicates a follow-up to previous context
 */
export function isFollowUpMessage(message: string): boolean {
  const followUpPatterns = [
    /^(?:and\s+)?(?:also|now)\s+/i,
    /^(?:ok|okay|yes|sure),?\s+(?:and\s+)?/i,
    /^(?:can you|please)\s+also/i,
    /^(?:then|next)\s+/i,
    /^add\s+(?:a\s+)?(?:another|more)/i,
  ];

  return followUpPatterns.some((p) => p.test(message));
}

/**
 * Detect if the message contains conditional logic
 * Conditional messages need more steps to handle branching
 */
export function hasConditionalLogic(message: string): boolean {
  const conditionalPatterns = [
    /\bif\s+(?:the|there|it)\b/i,
    /\bwhen\s+(?:the|there|it)\b/i,
    /\bunless\b/i,
    /\botherwise\b/i,
    /\belse\b/i,
  ];

  return conditionalPatterns.some((p) => p.test(message));
}
