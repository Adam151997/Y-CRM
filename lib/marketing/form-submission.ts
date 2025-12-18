/**
 * Form Submission Handler
 * Processes form submissions and creates leads
 */

import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormSettings {
  redirectUrl?: string;
  confirmationMessage?: string;
  notifyEmails?: string[];
}

export interface SubmissionData {
  [fieldId: string]: string | number | boolean | string[];
}

export interface SubmissionResult {
  success: boolean;
  submissionId?: string;
  leadId?: string;
  redirectUrl?: string;
  confirmationMessage?: string;
  error?: string;
}

/**
 * Map form field data to Lead fields based on field labels and types
 */
function mapFormDataToLead(
  fields: FormField[],
  data: SubmissionData
): {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
} {
  let firstName = "";
  let lastName = "";
  let email: string | undefined;
  let phone: string | undefined;
  let company: string | undefined;
  let title: string | undefined;

  for (const field of fields) {
    const value = data[field.id];
    if (!value || typeof value !== "string") continue;

    const labelLower = field.label.toLowerCase();

    // Email field
    if (field.type === "email" || labelLower.includes("email")) {
      email = value;
      continue;
    }

    // Phone field
    if (field.type === "phone" || labelLower.includes("phone") || labelLower.includes("mobile")) {
      phone = value;
      continue;
    }

    // Name fields
    if (labelLower.includes("first name") || labelLower === "first") {
      firstName = value;
      continue;
    }

    if (labelLower.includes("last name") || labelLower === "last") {
      lastName = value;
      continue;
    }

    // Full name - split into first and last
    if (labelLower === "name" || labelLower === "full name" || labelLower.includes("your name")) {
      const parts = value.trim().split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
      continue;
    }

    // Company
    if (labelLower.includes("company") || labelLower.includes("organization") || labelLower.includes("business")) {
      company = value;
      continue;
    }

    // Title
    if (labelLower.includes("title") || labelLower.includes("position") || labelLower.includes("role") || labelLower.includes("job")) {
      title = value;
      continue;
    }
  }

  // Fallback: if no name found, use email prefix
  if (!firstName && email) {
    firstName = email.split("@")[0] || "Unknown";
  }

  if (!firstName) {
    firstName = "Unknown";
  }

  if (!lastName) {
    lastName = "Visitor";
  }

  return { firstName, lastName, email, phone, company, title };
}

/**
 * Validate form submission data
 */
export function validateSubmission(
  fields: FormField[],
  data: SubmissionData
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = data[field.id];

    // Check required fields
    if (field.required) {
      if (value === undefined || value === null || value === "") {
        errors[field.id] = `${field.label} is required`;
        continue;
      }
    }

    // Skip validation if empty and not required
    if (!value) continue;

    // Type-specific validation
    if (field.type === "email" && typeof value === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors[field.id] = "Please enter a valid email address";
      }
    }

    if (field.type === "phone" && typeof value === "string") {
      // Basic phone validation - at least 7 digits
      const digits = value.replace(/\D/g, "");
      if (digits.length < 7) {
        errors[field.id] = "Please enter a valid phone number";
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Process form submission
 */
export async function processFormSubmission(
  formId: string,
  orgId: string,
  data: SubmissionData,
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  }
): Promise<SubmissionResult> {
  // Fetch form with settings
  const form = await prisma.form.findFirst({
    where: { id: formId, orgId, isActive: true },
  });

  if (!form) {
    return { success: false, error: "Form not found or inactive" };
  }

  const fields = form.fields as unknown as FormField[];
  const settings = form.settings as unknown as FormSettings | null;

  // Validate submission
  const validation = validateSubmission(fields, data);
  if (!validation.valid) {
    return {
      success: false,
      error: "Validation failed",
    };
  }

  let leadId: string | undefined;

  // Use transaction for atomic operations
  const result = await prisma.$transaction(async (tx) => {
    // Create lead if enabled
    if (form.createLead) {
      const leadData = mapFormDataToLead(fields, data);

      // Check for existing lead with same email
      let existingLead = null;
      if (leadData.email) {
        existingLead = await tx.lead.findFirst({
          where: { orgId, email: leadData.email },
        });
      }

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        const newLead = await tx.lead.create({
          data: {
            orgId,
            firstName: leadData.firstName,
            lastName: leadData.lastName,
            email: leadData.email,
            phone: leadData.phone,
            company: leadData.company,
            title: leadData.title,
            source: form.leadSource || "FORM",
            status: "NEW",
            assignedToId: form.assignToUserId,
          },
        });
        leadId = newLead.id;
      }
    }

    // Create form submission
    const submission = await tx.formSubmission.create({
      data: {
        orgId,
        formId,
        data: data as unknown as Prisma.InputJsonValue,
        leadId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        referrer: metadata.referrer,
      },
    });

    // Step 1: Atomically increment submissions count
    const updatedForm = await tx.form.update({
      where: { id: formId },
      data: {
        submissions: { increment: 1 },
      },
      select: {
        submissions: true,
        views: true,
      },
    });

    // Step 2: Calculate conversion rate with fresh values
    const conversionRate = updatedForm.views > 0 
      ? (updatedForm.submissions / updatedForm.views) * 100 
      : 0;

    // Step 3: Update conversion rate
    await tx.form.update({
      where: { id: formId },
      data: {
        conversionRate: new Prisma.Decimal(conversionRate.toFixed(2)),
      },
    });

    return submission;
  });

  return {
    success: true,
    submissionId: result.id,
    leadId,
    redirectUrl: settings?.redirectUrl,
    confirmationMessage: settings?.confirmationMessage || "Thank you for your submission!",
  };
}

/**
 * Increment form view count - DEPRECATED
 * View tracking is now handled directly in the page component
 * This function is kept for backward compatibility
 */
export async function incrementFormViews(formId: string): Promise<void> {
  await prisma.form.update({
    where: { id: formId },
    data: {
      views: { increment: 1 },
    },
  });
}
