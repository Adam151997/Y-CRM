import { z } from "zod";

// =============================================================================
// LEAD SCHEMAS
// =============================================================================

export const leadSourceSchema = z.enum([
  "REFERRAL",
  "WEBSITE",
  "COLD_CALL",
  "LINKEDIN",
  "TRADE_SHOW",
  "ADVERTISEMENT",
  "EMAIL_CAMPAIGN",
  "OTHER",
]);

export const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
]);

export const createLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  source: leadSourceSchema.optional().nullable(),
  status: leadStatusSchema.default("NEW"),
  pipelineStageId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  customFields: z.record(z.unknown()).default({}),
});

export const updateLeadSchema = createLeadSchema.partial();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// =============================================================================
// CONTACT SCHEMAS
// =============================================================================

export const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
  customFields: z.record(z.unknown()).default({}),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// =============================================================================
// ACCOUNT SCHEMAS
// =============================================================================

export const accountTypeSchema = z.enum([
  "PROSPECT",
  "CUSTOMER",
  "PARTNER",
  "VENDOR",
]);

export const accountRatingSchema = z.enum(["HOT", "WARM", "COLD"]);

export const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(200),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url("Invalid URL").optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: addressSchema.optional().nullable(),
  annualRevenue: z.number().positive().optional().nullable(),
  employeeCount: z.number().int().positive().optional().nullable(),
  type: accountTypeSchema.optional().nullable(),
  rating: accountRatingSchema.optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  customFields: z.record(z.unknown()).default({}),
});

export const updateAccountSchema = createAccountSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// =============================================================================
// OPPORTUNITY SCHEMAS
// =============================================================================

export const createOpportunitySchema = z.object({
  name: z.string().min(1, "Opportunity name is required").max(200),
  value: z.number().positive("Value must be positive"),
  currency: z.string().length(3).default("USD"),
  probability: z.number().int().min(0).max(100).default(50),
  accountId: z.string().uuid("Invalid account ID"),
  stageId: z.string().uuid("Invalid stage ID"),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  customFields: z.record(z.unknown()).default({}),
});

export const updateOpportunitySchema = createOpportunitySchema.partial();

export const closeOpportunitySchema = z.object({
  closedWon: z.boolean(),
  actualCloseDate: z.coerce.date().default(() => new Date()),
  lostReason: z.string().max(500).optional().nullable(),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type CloseOpportunityInput = z.infer<typeof closeOpportunitySchema>;

// =============================================================================
// TASK SCHEMAS
// =============================================================================

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const taskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const taskTypeSchema = z.enum([
  "CALL",
  "EMAIL",
  "MEETING",
  "FOLLOW_UP",
  "OTHER",
]);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: taskPrioritySchema.default("MEDIUM"),
  status: taskStatusSchema.default("PENDING"),
  taskType: taskTypeSchema.optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  opportunityId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// =============================================================================
// NOTE SCHEMAS
// =============================================================================

export const createNoteSchema = z.object({
  content: z.string().min(1, "Note content is required").max(10000),
  leadId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  opportunityId: z.string().uuid().optional().nullable(),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(10000),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

// =============================================================================
// ACTIVITY SCHEMAS
// =============================================================================

export const activityTypeSchema = z.enum([
  "CALL",
  "EMAIL",
  "MEETING",
  "VOICE_COMMAND",
  "NOTE",
  "TASK_COMPLETED",
]);

export const createActivitySchema = z.object({
  type: activityTypeSchema,
  subject: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  transcript: z.string().max(10000).optional().nullable(),
  audioUrl: z.string().url().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

// =============================================================================
// PIPELINE STAGE SCHEMAS
// =============================================================================

export const pipelineModuleSchema = z.enum(["LEAD", "OPPORTUNITY"]);

export const createPipelineStageSchema = z.object({
  name: z.string().min(1).max(100),
  module: pipelineModuleSchema,
  order: z.number().int().min(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  probability: z.number().int().min(0).max(100).optional().nullable(),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

export const updatePipelineStageSchema = createPipelineStageSchema.partial();

export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;
export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;

// =============================================================================
// CUSTOM FIELD DEFINITION SCHEMAS
// =============================================================================

export const customFieldModuleSchema = z.enum([
  "LEAD",
  "CONTACT",
  "ACCOUNT",
  "OPPORTUNITY",
]);

export const customFieldTypeSchema = z.enum([
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "CURRENCY",
  "PERCENT",
  "DATE",
  "SELECT",
  "MULTISELECT",
  "BOOLEAN",
  "URL",
  "EMAIL",
  "PHONE",
  "RELATIONSHIP",
  "FILE",
]);

export const createCustomFieldSchema = z.object({
  module: customFieldModuleSchema,
  fieldName: z.string().min(1).max(100),
  fieldKey: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Field key must start with a letter and contain only lowercase letters, numbers, and underscores"
    ),
  fieldType: customFieldTypeSchema,
  required: z.boolean().default(false),
  options: z.array(z.string()).optional().nullable(),
  defaultValue: z.unknown().optional().nullable(),
  placeholder: z.string().max(200).optional().nullable(),
  helpText: z.string().max(500).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateCustomFieldSchema = createCustomFieldSchema
  .partial()
  .omit({ module: true, fieldKey: true });

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;

// =============================================================================
// SEARCH & FILTER SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const searchSchema = z.object({
  query: z.string().max(200).optional(),
});

export const leadFilterSchema = paginationSchema.merge(sortSchema).merge(searchSchema).extend({
  status: leadStatusSchema.optional(),
  source: leadSourceSchema.optional(),
  assignedToId: z.string().optional(),
  pipelineStageId: z.string().uuid().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export type LeadFilterInput = z.infer<typeof leadFilterSchema>;
