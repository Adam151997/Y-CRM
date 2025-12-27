/**
 * Webhook Trigger Service
 * Handles sending outgoing webhooks when CRM events occur
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { safeDecrypt } from "@/lib/encryption";
import type { WebhookEventType } from "@/lib/integrations";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface TriggerResult {
  integrationId: string;
  success: boolean;
  status?: number;
  error?: string;
  duration?: number;
}

/**
 * Trigger webhooks for a specific event
 * @param orgId - Organization ID
 * @param eventType - The event type (e.g., "invoice.created")
 * @param data - The event data payload
 * @returns Array of trigger results
 */
export async function triggerWebhooks(
  orgId: string,
  eventType: WebhookEventType | string,
  data: Record<string, unknown>
): Promise<TriggerResult[]> {
  const results: TriggerResult[] = [];

  try {
    // Find all enabled integrations that listen to this event
    const integrations = await prisma.regularIntegration.findMany({
      where: {
        orgId,
        isEnabled: true,
        type: "webhook_outgoing",
        events: {
          has: eventType,
        },
      },
    });

    if (integrations.length === 0) {
      return results;
    }

    // Prepare the webhook payload
    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    // Send webhooks in parallel
    const deliveryPromises = integrations.map((integration) =>
      deliverWebhook(integration, payload, orgId)
    );

    const deliveryResults = await Promise.allSettled(deliveryPromises);

    for (let i = 0; i < integrations.length; i++) {
      const result = deliveryResults[i];
      const integration = integrations[i];

      if (result.status === "fulfilled") {
        results.push({
          integrationId: integration.id,
          ...result.value,
        });
      } else {
        results.push({
          integrationId: integration.id,
          success: false,
          error: result.reason?.message || "Unknown error",
        });
      }
    }
  } catch (error) {
    console.error("[Webhook Trigger] Error:", error);
  }

  return results;
}

/**
 * Deliver a webhook to a specific integration
 */
async function deliverWebhook(
  integration: {
    id: string;
    config: unknown;
  },
  payload: WebhookPayload,
  orgId: string
): Promise<{ success: boolean; status?: number; error?: string; duration?: number }> {
  const config = integration.config as Record<string, unknown>;
  const url = config.url as string;

  if (!url) {
    return { success: false, error: "No URL configured" };
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Source": "Y-CRM",
    "X-Webhook-Event": payload.event,
    "X-Webhook-Timestamp": payload.timestamp,
    ...(config.headers as Record<string, string> || {}),
  };

  // Add authentication
  const authType = config.authType as string;
  if (authType && authType !== "none") {
    let authConfig = config.authConfig;
    if (typeof authConfig === "string") {
      const decrypted = safeDecrypt(authConfig);
      if (decrypted) {
        authConfig = JSON.parse(decrypted);
      }
    }

    const auth = authConfig as Record<string, string> | null;
    if (auth) {
      switch (authType) {
        case "bearer":
          headers["Authorization"] = `Bearer ${auth.bearerToken}`;
          break;
        case "api_key":
          headers[auth.headerName || "X-API-Key"] = auth.apiKey || "";
          break;
        case "basic":
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
          break;
      }
    }
  }

  const startTime = Date.now();
  let responseStatus: number | undefined;
  let responseBody: string | undefined;
  let errorMessage: string | undefined;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    responseStatus = response.status;
    responseBody = await response.text();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  const duration = Date.now() - startTime;
  const success = responseStatus !== undefined && responseStatus >= 200 && responseStatus < 300;

  // Log the delivery attempt
  try {
    await prisma.webhookDelivery.create({
      data: {
        orgId,
        integrationId: integration.id,
        eventType: payload.event,
        requestUrl: url,
        requestHeaders: headers as unknown as Prisma.InputJsonValue,
        requestBody: payload as unknown as Prisma.InputJsonValue,
        responseStatus,
        responseBody: responseBody?.slice(0, 10000), // Limit stored response
        attemptedAt: new Date(),
        duration,
        status: success ? "SUCCESS" : "FAILED",
        errorMessage,
      },
    });

    // Update integration stats
    await prisma.regularIntegration.update({
      where: { id: integration.id },
      data: {
        lastTriggeredAt: new Date(),
        ...(success
          ? { successCount: { increment: 1 } }
          : { failureCount: { increment: 1 }, lastError: errorMessage || `HTTP ${responseStatus}` }),
      },
    });
  } catch (dbError) {
    console.error("[Webhook Delivery Log] Error:", dbError);
  }

  return {
    success,
    status: responseStatus,
    error: errorMessage,
    duration,
  };
}

/**
 * Helper function to trigger invoice-related webhooks
 */
export async function triggerInvoiceWebhook(
  orgId: string,
  eventType: "invoice.created" | "invoice.updated" | "invoice.paid" | "invoice.cancelled",
  invoice: Record<string, unknown>
) {
  return triggerWebhooks(orgId, eventType, {
    invoice,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.total,
    status: invoice.status,
  });
}

/**
 * Helper function to trigger lead-related webhooks
 */
export async function triggerLeadWebhook(
  orgId: string,
  eventType: "lead.created" | "lead.updated" | "lead.converted",
  lead: Record<string, unknown>
) {
  return triggerWebhooks(orgId, eventType, {
    lead,
    leadId: lead.id,
    email: lead.email,
    name: `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
    status: lead.status,
  });
}

/**
 * Helper function to trigger contact-related webhooks
 */
export async function triggerContactWebhook(
  orgId: string,
  eventType: "contact.created" | "contact.updated",
  contact: Record<string, unknown>
) {
  return triggerWebhooks(orgId, eventType, {
    contact,
    contactId: contact.id,
    email: contact.email,
    name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
  });
}

/**
 * Helper function to trigger opportunity-related webhooks
 */
export async function triggerOpportunityWebhook(
  orgId: string,
  eventType: "opportunity.created" | "opportunity.updated" | "opportunity.won" | "opportunity.lost",
  opportunity: Record<string, unknown>
) {
  return triggerWebhooks(orgId, eventType, {
    opportunity,
    opportunityId: opportunity.id,
    name: opportunity.name,
    value: opportunity.value,
    stage: opportunity.stage,
  });
}
