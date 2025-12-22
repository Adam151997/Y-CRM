# AI Agent Improvements Plan

## Executive Summary

This document outlines the implementation plan for addressing two critical concerns in the Y-CRM AI agent:

1. **Single-Step Limit** - Agent limited to `maxSteps: 1`, restricting complex multi-step reasoning
2. **Large Schema File** - `tools.ts` is 3530 lines, may hit Gemini schema complexity limits

---

## Concern 1: Single-Step Limit

### Current State

**File**: `lib/ai/agent.ts:675`

```typescript
maxSteps: 1, // Single step - tool-level resolution handles entity lookups internally
```

**Problem**: The agent cannot perform multi-step reasoning. For example:
- Cannot search for an account, then create a ticket, then add a note in one request
- Complex workflows require multiple user messages
- Entity resolution is handled inside each tool (creating redundant code)

### Solution: Implement Adaptive Multi-Step Execution

#### Approach: Smart Step Limit Based on Intent Complexity

Instead of a fixed `maxSteps: 1`, implement an adaptive system that:
1. Analyzes user intent complexity
2. Sets appropriate step limits (1-5 steps based on complexity)
3. Maintains safety guardrails to prevent runaway loops

#### Implementation Steps

##### Step 1: Create Complexity Analyzer

**New File**: `lib/ai/complexity-analyzer.ts`

```typescript
export type IntentComplexity = 'simple' | 'moderate' | 'complex';

export interface ComplexityAnalysis {
  complexity: IntentComplexity;
  maxSteps: number;
  requiresEntityResolution: boolean;
  estimatedToolCalls: number;
  actions: string[];
}

export function analyzeIntentComplexity(message: string): ComplexityAnalysis {
  // Detect multiple actions (create X AND create Y)
  // Detect entity resolution needs (for Account X, create ticket)
  // Detect chained operations (create lead then add task)
  // Return appropriate maxSteps: 1 (simple), 3 (moderate), 5 (complex)
}
```

**Complexity Indicators**:
| Pattern | Complexity | Max Steps |
|---------|------------|-----------|
| Single action, no entity lookup | Simple | 1 |
| Single action with entity lookup | Moderate | 3 |
| Multiple actions (AND/THEN) | Complex | 5 |
| Conditional logic (IF/WHEN) | Complex | 5 |

##### Step 2: Update Agent Execution

**File**: `lib/ai/agent.ts`

```typescript
// Replace static maxSteps: 1 with:
const complexity = analyzeIntentComplexity(userContent);

const result = await generateText({
  model: geminiPro,
  system: enhancedSystemPrompt,
  messages,
  tools: tools as any,
  toolChoice: toolChoiceMode,
  maxSteps: complexity.maxSteps, // Dynamic: 1-5 based on complexity
  // Add step callback for monitoring
  onStepFinish: ({ toolCalls, toolResults: stepToolResults, stepNumber }) => {
    // Track steps for anti-loop detection
    // Abort if same tool called with same args twice
  },
});
```

##### Step 3: Add Anti-Loop Safeguards

```typescript
// In onStepFinish callback:
const callSignature = `${toolName}:${JSON.stringify(args)}`;
if (executedCalls.has(callSignature)) {
  throw new AgentLoopError(`Tool ${toolName} already called with same arguments`);
}
executedCalls.add(callSignature);
```

##### Step 4: Update System Prompt for Multi-Step

Add to `lib/ai/providers.ts`:

```typescript
## MULTI-STEP EXECUTION

You can now execute multiple steps in a single request:

1. **Entity Resolution First**: If creating linked records, search for the parent entity first
2. **Sequential Operations**: For "create X then Y", execute tools in order
3. **Stop When Done**: Once the user's request is fulfilled, stop - don't add extra actions

Examples:
- "Create a ticket for Acme Corp" → searchAccounts → createTicket (2 steps)
- "Add a task to follow up on the Anthropic lead" → searchLeads → createTask (2 steps)
- "Create a lead John Doe and add a follow-up task" → createLead → createTask (2 steps)
```

#### Benefits

- Complex workflows in single request
- Proper entity resolution without tool-level hacks
- Better user experience
- Reduced token usage (fewer round trips)

#### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Infinite loops | Anti-loop detection, max 5 steps hard limit |
| Unnecessary tool calls | Explicit system prompt instructions |
| Higher latency | Acceptable trade-off for complex requests |
| Cost increase | Complexity analysis minimizes unnecessary steps |

---

## Concern 2: Large Schema File (3530 lines)

### Current State

**File**: `lib/ai/tools.ts` - 3530 lines, 51 tools in single file

**Problems**:
1. Gemini has schema complexity limits ("too many states for serving")
2. All 51 tools loaded even when only 5-10 needed
3. Poor maintainability
4. Slow IDE performance

### Solution: Modular Tool Architecture with Dynamic Loading

#### Approach: Workspace-Based Tool Modules

Split tools into smaller, focused modules loaded on-demand:

```
lib/ai/tools/
├── index.ts              # Tool registry & loader
├── types.ts              # Shared types & interfaces
├── helpers.ts            # Shared helper functions
├── sales/
│   ├── index.ts          # Sales workspace exports
│   ├── leads.ts          # Lead tools (~200 lines)
│   ├── contacts.ts       # Contact tools (~200 lines)
│   ├── accounts.ts       # Account tools (~200 lines)
│   └── opportunities.ts  # Opportunity tools (~200 lines)
├── cs/
│   ├── index.ts          # CS workspace exports
│   ├── tickets.ts        # Ticket tools (~300 lines)
│   ├── health.ts         # Health score tools (~150 lines)
│   ├── playbooks.ts      # Playbook tools (~200 lines)
│   └── renewals.ts       # Renewal tools (~250 lines)
├── marketing/
│   ├── index.ts          # Marketing workspace exports
│   ├── campaigns.ts      # Campaign tools (~200 lines)
│   ├── segments.ts       # Segment tools (~150 lines)
│   └── forms.ts          # Form tools (~150 lines)
├── global/
│   ├── index.ts          # Global tools exports
│   ├── tasks.ts          # Task tools (~200 lines)
│   ├── notes.ts          # Note tools (~100 lines)
│   ├── dashboard.ts      # Dashboard tools (~150 lines)
│   ├── documents.ts      # Document tools (~200 lines)
│   └── search.ts         # Semantic search (~100 lines)
├── custom-modules/
│   ├── index.ts          # Custom module exports
│   └── records.ts        # Custom module tools (~300 lines)
└── integrations/
    ├── index.ts          # Integration exports
    ├── google.ts         # Gmail & Calendar (~300 lines)
    ├── slack.ts          # Slack tools (~150 lines)
    └── reports.ts        # Report generation (~200 lines)
```

#### Implementation Steps

##### Step 1: Create Tool Registry System

**File**: `lib/ai/tools/index.ts`

```typescript
import type { Tool } from 'ai';

export type ToolCategory =
  | 'sales'
  | 'cs'
  | 'marketing'
  | 'global'
  | 'custom-modules'
  | 'integrations';

export interface ToolRegistry {
  getTools(categories: ToolCategory[], orgId: string, userId: string): Record<string, Tool>;
  getToolsForIntent(intent: string, orgId: string, userId: string): Record<string, Tool>;
  getToolsForWorkspace(workspace: string, orgId: string, userId: string): Record<string, Tool>;
}

// Dynamic imports for code splitting
const toolModules: Record<ToolCategory, () => Promise<ToolModule>> = {
  'sales': () => import('./sales'),
  'cs': () => import('./cs'),
  'marketing': () => import('./marketing'),
  'global': () => import('./global'),
  'custom-modules': () => import('./custom-modules'),
  'integrations': () => import('./integrations'),
};

export async function loadTools(
  categories: ToolCategory[],
  orgId: string,
  userId: string
): Promise<Record<string, Tool>> {
  const tools: Record<string, Tool> = {};

  for (const category of categories) {
    const module = await toolModules[category]();
    Object.assign(tools, module.createTools(orgId, userId));
  }

  return tools;
}
```

##### Step 2: Create Shared Types

**File**: `lib/ai/tools/types.ts`

```typescript
import { z } from 'zod';

export interface ToolResult {
  success: boolean;
  message: string;
  [key: string]: unknown;
}

export interface ToolModule {
  createTools(orgId: string, userId: string): Record<string, unknown>;
}

// Common Zod schemas
export const paginationSchema = z.object({
  limit: z.number().min(1).max(20).default(5),
  offset: z.number().min(0).default(0),
});

export const assignmentSchema = z.object({
  assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me'"),
});
```

##### Step 3: Create Workspace Modules

**File**: `lib/ai/tools/sales/leads.ts`

```typescript
import { z } from 'zod';
import { tool } from 'ai';
import prisma from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { revalidateLeadCaches } from '@/lib/cache-utils';
import { resolveUser } from '@/lib/user-resolver';
import type { ToolResult } from '../types';

export function createLeadTools(orgId: string, userId: string) {
  return {
    createLead: createLeadTool(orgId, userId),
    searchLeads: searchLeadsTool(orgId),
    updateLead: updateLeadTool(orgId, userId),
  };
}

// Tool implementations (moved from tools.ts)
const createLeadTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new lead in the CRM",
    parameters: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().optional(),
      // ... rest of schema
    }),
    execute: async (params): Promise<ToolResult> => {
      // Implementation
    },
  });
```

##### Step 4: Update Agent to Use Registry

**File**: `lib/ai/agent.ts`

```typescript
import { loadTools, ToolCategory } from './tools';
import { analyzeIntentComplexity } from './complexity-analyzer';

// Determine which tool categories to load based on workspace and intent
function getRequiredCategories(
  workspace: string | undefined,
  primaryAction: PrimaryAction
): ToolCategory[] {
  const categories: ToolCategory[] = ['global']; // Always include global

  switch (workspace) {
    case 'sales':
      categories.push('sales');
      break;
    case 'cs':
      categories.push('cs', 'sales'); // CS needs account tools from sales
      break;
    case 'marketing':
      categories.push('marketing');
      break;
    default:
      // If no workspace, load based on detected intent
      if (['lead', 'contact', 'account', 'opportunity'].includes(primaryAction)) {
        categories.push('sales');
      }
      if (['ticket', 'renewal'].includes(primaryAction)) {
        categories.push('cs', 'sales');
      }
      if (['campaign', 'segment', 'form'].includes(primaryAction)) {
        categories.push('marketing');
      }
  }

  // Add integrations if needed
  if (['email', 'calendar', 'slack'].includes(primaryAction)) {
    categories.push('integrations');
  }

  return categories;
}

export async function executeAgent(
  messages: CoreMessage[],
  context: AgentContext
): Promise<AgentResult> {
  // ... existing code ...

  // Dynamic tool loading
  const categories = getRequiredCategories(workspace, primaryAction);
  const tools = await loadTools(categories, orgId, userId);

  // ... rest of execution ...
}
```

##### Step 5: Add Tool Schema Validation

**File**: `lib/ai/tools/validator.ts`

```typescript
/**
 * Validate tool schemas don't exceed Gemini's complexity limits
 * Run this during build/test to catch issues early
 */
export function validateToolSchemas(tools: Record<string, unknown>): {
  valid: boolean;
  issues: string[];
  totalProperties: number;
  estimatedStates: number;
} {
  let totalProperties = 0;
  const issues: string[] = [];

  for (const [name, tool] of Object.entries(tools)) {
    const schema = (tool as any).parameters;
    const properties = countSchemaProperties(schema);
    totalProperties += properties;

    if (properties > 50) {
      issues.push(`Tool "${name}" has ${properties} properties (consider splitting)`);
    }
  }

  // Gemini limit is approximately 1000 total schema states
  const estimatedStates = totalProperties * 2; // Rough estimate

  return {
    valid: issues.length === 0 && estimatedStates < 1000,
    issues,
    totalProperties,
    estimatedStates,
  };
}
```

#### Migration Strategy

1. **Phase 1**: Create new directory structure, keep old file working
2. **Phase 2**: Move tools one category at a time, with tests
3. **Phase 3**: Update agent to use new system
4. **Phase 4**: Remove old tools.ts file
5. **Phase 5**: Add build-time schema validation

#### Benefits

| Benefit | Impact |
|---------|--------|
| Reduced schema complexity | Fixes "too many states" Gemini errors |
| Faster initial load | Only load needed tools |
| Better maintainability | ~150-300 lines per file vs 3530 |
| Tree-shaking support | Smaller bundles |
| Parallel development | Team can work on different modules |

---

## Implementation Order

### Phase 1: Modular Tools (Address Schema Complexity First)

**Priority: HIGH** - Blocking issue

1. Create `lib/ai/tools/` directory structure
2. Create shared types and helpers
3. Migrate sales tools (leads, contacts, accounts, opportunities)
4. Migrate CS tools (tickets, health, playbooks, renewals)
5. Migrate marketing tools (campaigns, segments, forms)
6. Migrate global tools (tasks, notes, dashboard, documents)
7. Migrate custom module tools
8. Migrate integration tools
9. Create tool registry with dynamic loading
10. Update agent to use new system
11. Add schema validation tests
12. Remove old tools.ts

**Estimated Files**: 20+ new files, 1 deleted

### Phase 2: Multi-Step Execution (Enable Complex Workflows)

**Priority: MEDIUM** - Enhancement

1. Create complexity analyzer
2. Update agent execution with adaptive steps
3. Add anti-loop safeguards
4. Update system prompt for multi-step
5. Add monitoring/logging for step execution
6. Test with complex multi-step scenarios

**Estimated Files**: 2-3 new files, 2 modified

---

## Testing Strategy

### Unit Tests

```typescript
// lib/ai/tools/__tests__/registry.test.ts
describe('Tool Registry', () => {
  it('loads only requested categories', async () => {
    const tools = await loadTools(['sales'], 'org-1', 'user-1');
    expect(Object.keys(tools)).toContain('createLead');
    expect(Object.keys(tools)).not.toContain('createTicket');
  });

  it('validates schema complexity', () => {
    const result = validateToolSchemas(allTools);
    expect(result.valid).toBe(true);
    expect(result.estimatedStates).toBeLessThan(1000);
  });
});
```

### Integration Tests

```typescript
// lib/ai/__tests__/multi-step.test.ts
describe('Multi-Step Execution', () => {
  it('handles entity resolution in multiple steps', async () => {
    const result = await executeAgent([
      { role: 'user', content: 'Create a ticket for Acme Corp about billing' }
    ], context);

    expect(result.toolsCalled).toContain('searchAccounts');
    expect(result.toolsCalled).toContain('createTicket');
  });

  it('prevents infinite loops', async () => {
    // Test that same tool+args isn't called twice
  });
});
```

---

## Rollback Plan

If issues arise after deployment:

1. **Tool Registry Issues**: Keep old `tools.ts` as `tools.legacy.ts`, switch import
2. **Multi-Step Issues**: Set `maxSteps: 1` as fallback in complexity analyzer
3. **Schema Errors**: Log and fall back to minimal tool set

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Schema complexity errors | Occasional | Zero |
| Tools per request | 51 (all) | 10-15 (filtered) |
| Multi-step workflows | Impossible | Supported |
| tools.ts file size | 3530 lines | Deleted |
| Largest tool file | 3530 lines | <300 lines |
| Average response latency | Baseline | +10% max for multi-step |

---

## Files to Create/Modify

### New Files (Phase 1 - Tool Modularization)

- `lib/ai/tools/index.ts` - Tool registry
- `lib/ai/tools/types.ts` - Shared types
- `lib/ai/tools/helpers.ts` - Shared helpers
- `lib/ai/tools/validator.ts` - Schema validation
- `lib/ai/tools/sales/index.ts`
- `lib/ai/tools/sales/leads.ts`
- `lib/ai/tools/sales/contacts.ts`
- `lib/ai/tools/sales/accounts.ts`
- `lib/ai/tools/sales/opportunities.ts`
- `lib/ai/tools/cs/index.ts`
- `lib/ai/tools/cs/tickets.ts`
- `lib/ai/tools/cs/health.ts`
- `lib/ai/tools/cs/playbooks.ts`
- `lib/ai/tools/cs/renewals.ts`
- `lib/ai/tools/marketing/index.ts`
- `lib/ai/tools/marketing/campaigns.ts`
- `lib/ai/tools/marketing/segments.ts`
- `lib/ai/tools/marketing/forms.ts`
- `lib/ai/tools/global/index.ts`
- `lib/ai/tools/global/tasks.ts`
- `lib/ai/tools/global/notes.ts`
- `lib/ai/tools/global/dashboard.ts`
- `lib/ai/tools/global/documents.ts`
- `lib/ai/tools/global/search.ts`
- `lib/ai/tools/custom-modules/index.ts`
- `lib/ai/tools/custom-modules/records.ts`
- `lib/ai/tools/integrations/index.ts`
- `lib/ai/tools/integrations/google.ts`
- `lib/ai/tools/integrations/slack.ts`
- `lib/ai/tools/integrations/reports.ts`

### New Files (Phase 2 - Multi-Step)

- `lib/ai/complexity-analyzer.ts`

### Modified Files

- `lib/ai/agent.ts` - Use new tool registry, adaptive maxSteps
- `lib/ai/providers.ts` - Update system prompt

### Deleted Files

- `lib/ai/tools.ts` (after migration complete)

---

## Awaiting Your Command

This plan is ready for review. Let me know when you'd like me to proceed with implementation.

Options:
- **"Proceed with Phase 1"** - Start modular tool architecture
- **"Proceed with Phase 2"** - Start multi-step execution
- **"Proceed with both"** - Implement both phases
- **"Modify plan"** - Request changes to the approach
