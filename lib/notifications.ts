import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

export type NotificationType =
  | "LEAD_CREATED"
  | "LEAD_CONVERTED"
  | "CONTACT_CREATED"
  | "ACCOUNT_CREATED"
  | "TASK_CREATED"
  | "TASK_ASSIGNED"
  | "TASK_COMPLETED"
  | "OPPORTUNITY_CREATED"
  | "OPPORTUNITY_WON"
  | "OPPORTUNITY_LOST"
  | "TICKET_CREATED"
  | "TICKET_RESOLVED"
  | "PIPELINE_MOVED"
  | "AI_ACTION"
  // Renewals
  | "RENEWAL_CREATED"
  | "RENEWAL_UPDATED"
  | "RENEWAL_EXPIRING"
  // Invoices
  | "INVOICE_CREATED"
  | "INVOICE_SENT"
  | "INVOICE_PAID"
  | "INVOICE_OVERDUE"
  // Custom Modules
  | "CUSTOM_RECORD_CREATED"
  | "CUSTOM_RECORD_UPDATED"
  // Marketing
  | "CAMPAIGN_CREATED"
  | "CAMPAIGN_LAUNCHED"
  | "FORM_SUBMISSION"
  // General
  | "RECORD_UPDATED"
  | "RECORD_DELETED";

export interface CreateNotificationParams {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        orgId: params.orgId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    return notification;
  } catch (error) {
    console.error("[Notifications] Failed to create notification:", error);
    return null;
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotifications(
  notifications: CreateNotificationParams[]
) {
  try {
    const result = await prisma.notification.createMany({
      data: notifications.map((n) => ({
        orgId: n.orgId,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        entityType: n.entityType,
        entityId: n.entityId,
        metadata: n.metadata as Prisma.InputJsonValue | undefined,
      })),
    });
    return result;
  } catch (error) {
    console.error("[Notifications] Failed to create notifications:", error);
    return null;
  }
}

/**
 * Get unread notifications count for a user
 */
export async function getUnreadCount(orgId: string, userId: string) {
  return prisma.notification.count({
    where: {
      orgId,
      userId,
      isRead: false,
    },
  });
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  orgId: string,
  userId: string,
  options?: { limit?: number; includeRead?: boolean }
) {
  const { limit = 20, includeRead = true } = options || {};

  return prisma.notification.findMany({
    where: {
      orgId,
      userId,
      ...(includeRead ? {} : { isRead: false }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(orgId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      orgId,
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Delete old notifications (cleanup job)
 */
export async function cleanupOldNotifications(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true,
    },
  });
}

/**
 * Get notification title based on type
 */
export function getNotificationTitle(
  type: NotificationType,
  entityName?: string
): string {
  const name = entityName ? `: ${entityName}` : "";
  
  switch (type) {
    // Leads
    case "LEAD_CREATED":
      return `New lead created${name}`;
    case "LEAD_CONVERTED":
      return `Lead converted${name}`;
    // Contacts
    case "CONTACT_CREATED":
      return `New contact created${name}`;
    // Accounts
    case "ACCOUNT_CREATED":
      return `New account created${name}`;
    // Tasks
    case "TASK_CREATED":
      return `New task created${name}`;
    case "TASK_ASSIGNED":
      return `Task assigned to you${name}`;
    case "TASK_COMPLETED":
      return `Task completed${name}`;
    // Opportunities
    case "OPPORTUNITY_CREATED":
      return `New opportunity created${name}`;
    case "OPPORTUNITY_WON":
      return `Opportunity won${name}`;
    case "OPPORTUNITY_LOST":
      return `Opportunity lost${name}`;
    // Tickets
    case "TICKET_CREATED":
      return `New ticket created${name}`;
    case "TICKET_RESOLVED":
      return `Ticket resolved${name}`;
    // Renewals
    case "RENEWAL_CREATED":
      return `New renewal tracked${name}`;
    case "RENEWAL_UPDATED":
      return `Renewal updated${name}`;
    case "RENEWAL_EXPIRING":
      return `Renewal expiring soon${name}`;
    // Invoices
    case "INVOICE_CREATED":
      return `Invoice created${name}`;
    case "INVOICE_SENT":
      return `Invoice sent${name}`;
    case "INVOICE_PAID":
      return `Invoice paid${name}`;
    case "INVOICE_OVERDUE":
      return `Invoice overdue${name}`;
    // Custom Modules
    case "CUSTOM_RECORD_CREATED":
      return `New record created${name}`;
    case "CUSTOM_RECORD_UPDATED":
      return `Record updated${name}`;
    // Marketing
    case "CAMPAIGN_CREATED":
      return `Campaign created${name}`;
    case "CAMPAIGN_LAUNCHED":
      return `Campaign launched${name}`;
    case "FORM_SUBMISSION":
      return `New form submission${name}`;
    // General
    case "PIPELINE_MOVED":
      return `Pipeline stage changed${name}`;
    case "AI_ACTION":
      return `AI completed action${name}`;
    case "RECORD_UPDATED":
      return `Record updated${name}`;
    case "RECORD_DELETED":
      return `Record deleted${name}`;
    default:
      return "New notification";
  }
}
