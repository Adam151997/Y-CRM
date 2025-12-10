import prisma from "@/lib/db";

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
  | "AI_ACTION";

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
        metadata: params.metadata as Record<string, unknown> | undefined,
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
        metadata: n.metadata as Record<string, unknown> | undefined,
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
  switch (type) {
    case "LEAD_CREATED":
      return `New lead created${entityName ? `: ${entityName}` : ""}`;
    case "LEAD_CONVERTED":
      return `Lead converted${entityName ? `: ${entityName}` : ""}`;
    case "CONTACT_CREATED":
      return `New contact created${entityName ? `: ${entityName}` : ""}`;
    case "ACCOUNT_CREATED":
      return `New account created${entityName ? `: ${entityName}` : ""}`;
    case "TASK_CREATED":
      return `New task created${entityName ? `: ${entityName}` : ""}`;
    case "TASK_ASSIGNED":
      return `Task assigned to you${entityName ? `: ${entityName}` : ""}`;
    case "TASK_COMPLETED":
      return `Task completed${entityName ? `: ${entityName}` : ""}`;
    case "OPPORTUNITY_CREATED":
      return `New opportunity created${entityName ? `: ${entityName}` : ""}`;
    case "OPPORTUNITY_WON":
      return `Opportunity won${entityName ? `: ${entityName}` : ""}`;
    case "OPPORTUNITY_LOST":
      return `Opportunity lost${entityName ? `: ${entityName}` : ""}`;
    case "TICKET_CREATED":
      return `New ticket created${entityName ? `: ${entityName}` : ""}`;
    case "TICKET_RESOLVED":
      return `Ticket resolved${entityName ? `: ${entityName}` : ""}`;
    case "PIPELINE_MOVED":
      return `Pipeline stage changed${entityName ? `: ${entityName}` : ""}`;
    case "AI_ACTION":
      return `AI completed action${entityName ? `: ${entityName}` : ""}`;
    default:
      return "New notification";
  }
}
