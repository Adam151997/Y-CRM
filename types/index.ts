// Re-export Prisma types for convenience
import type {
  Lead,
  Contact,
  Account,
  Opportunity,
  Task,
  Note,
  Activity,
  Document,
  Organization,
  PipelineStage,
  CustomFieldDefinition,
  AuditLog,
  UsageRecord,
} from "@prisma/client";

export type {
  Lead,
  Contact,
  Account,
  Opportunity,
  Task,
  Note,
  Activity,
  Document,
  Organization,
  PipelineStage,
  CustomFieldDefinition,
  AuditLog,
  UsageRecord,
};

// =============================================================================
// EXTENDED TYPES WITH RELATIONS
// =============================================================================

export interface LeadWithRelations extends Lead {
  notes?: Note[];
  tasks?: Task[];
  activities?: Activity[];
  documents?: Document[];
  pipelineStage?: PipelineStage | null;
}

export interface ContactWithRelations extends Contact {
  notes?: Note[];
  tasks?: Task[];
  activities?: Activity[];
  account?: Account | null;
}

export interface AccountWithRelations extends Account {
  contacts?: Contact[];
  opportunities?: Opportunity[];
  notes?: Note[];
  tasks?: Task[];
  documents?: Document[];
}

export interface OpportunityWithRelations extends Opportunity {
  notes?: Note[];
  tasks?: Task[];
  account?: Account;
  stage?: PipelineStage;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// =============================================================================
// AUTH & USER TYPES
// =============================================================================

export interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
}

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface AuthContext {
  userId: string;
  orgId: string;
  user: UserInfo;
  org: OrgInfo;
}

// =============================================================================
// CONFIRMATION & VOICE TYPES
// =============================================================================

export type OperationType = "CREATE" | "UPDATE" | "DELETE";
export type OperationRisk = "LOW" | "MEDIUM" | "HIGH";
export type CRMModule = "LEAD" | "CONTACT" | "ACCOUNT" | "OPPORTUNITY" | "TASK" | "NOTE";

export interface PlannedOperation {
  id: string;
  type: OperationType;
  module: CRMModule;
  summary: string;
  details: Record<string, unknown>;
  risk: OperationRisk;
}

export interface ConfirmationRequest {
  id: string;
  originalTranscript: string;
  parsedIntent: string;
  operations: PlannedOperation[];
  alternatives?: string[];
  clarificationNeeded: boolean;
  clarificationQuestion?: string;
  expiresAt: Date;
}

export interface VoiceCommandResult {
  success: boolean;
  transcript?: string;
  confirmation?: ConfirmationRequest;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  results: Array<{
    operation: string;
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
  response: string;
}

// =============================================================================
// DASHBOARD & UI TYPES
// =============================================================================

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
}

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

export interface SearchResult {
  id: string;
  type: CRMModule;
  score: number;
  data: Record<string, unknown>;
}

export interface SearchOptions {
  modules?: CRMModule[];
  limit?: number;
  semanticWeight?: number;
}

// =============================================================================
// IMPORT/EXPORT TYPES
// =============================================================================

export interface ImportMapping {
  sourceColumn: string;
  targetField: string;
  transform?: "none" | "lowercase" | "uppercase" | "trim" | "date";
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    field: string;
    error: string;
  }>;
}

export interface ExportOptions {
  format: "csv" | "xlsx" | "json";
  fields?: string[];
  filters?: Record<string, unknown>;
}
