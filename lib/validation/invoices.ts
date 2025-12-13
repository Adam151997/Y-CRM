import { z } from "zod";

/**
 * Invoice Status enum values
 */
export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "CANCELLED",
  "VOID",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/**
 * Payment Method enum values
 */
export const PAYMENT_METHODS = [
  "CASH",
  "CHECK",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "BANK_TRANSFER",
  "PAYPAL",
  "STRIPE",
  "OTHER",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Discount Type enum values
 */
export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/**
 * Billing address schema
 */
export const billingAddressSchema = z.object({
  name: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

export type BillingAddress = z.infer<typeof billingAddressSchema>;

/**
 * Invoice item schema for creation/update
 */
export const invoiceItemSchema = z.object({
  id: z.string().optional(), // For updates
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be 0 or greater"),
  itemCode: z.string().optional(),
  sortOrder: z.number().optional(),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

/**
 * Create invoice schema
 */
export const createInvoiceSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
  
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  
  currency: z.string().default("USD"),
  taxRate: z.number().min(0).max(100).optional(),
  discountType: z.enum(DISCOUNT_TYPES).optional(),
  discountValue: z.number().min(0).optional(),
  
  notes: z.string().optional(),
  terms: z.string().optional(),
  footer: z.string().optional(),
  
  billingAddress: billingAddressSchema.optional(),
  
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  
  customFields: z.record(z.unknown()).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/**
 * Update invoice schema
 */
export const updateInvoiceSchema = z.object({
  accountId: z.string().optional(),
  contactId: z.string().nullable().optional(),
  opportunityId: z.string().nullable().optional(),
  
  status: z.enum(INVOICE_STATUSES).optional(),
  
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  
  currency: z.string().optional(),
  taxRate: z.number().min(0).max(100).nullable().optional(),
  discountType: z.enum(DISCOUNT_TYPES).nullable().optional(),
  discountValue: z.number().min(0).nullable().optional(),
  
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  footer: z.string().nullable().optional(),
  
  billingAddress: billingAddressSchema.nullable().optional(),
  
  items: z.array(invoiceItemSchema).optional(),
  
  customFields: z.record(z.unknown()).optional(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/**
 * Record payment schema
 */
export const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentDate: z.coerce.date().optional(),
  method: z.enum(PAYMENT_METHODS).default("BANK_TRANSFER"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

/**
 * Invoice filters schema
 */
export const invoiceFiltersSchema = z.object({
  status: z.enum(INVOICE_STATUSES).optional(),
  accountId: z.string().optional(),
  contactId: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["invoiceNumber", "issueDate", "dueDate", "total", "status", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type InvoiceFilters = z.infer<typeof invoiceFiltersSchema>;

/**
 * Send invoice schema
 */
export const sendInvoiceSchema = z.object({
  to: z.string().email("Valid email is required"),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  attachPdf: z.boolean().default(true),
});

export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;
