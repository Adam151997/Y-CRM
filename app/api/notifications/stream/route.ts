import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET /api/notifications/stream - SSE endpoint for real-time notifications
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const encoder = new TextEncoder();
    let isAborted = false;

    // Listen for abort signal
    request.signal.addEventListener("abort", () => {
      isAborted = true;
    });

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message with current notifications
        try {
          const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
              where: { orgId, userId },
              orderBy: { createdAt: "desc" },
              take: 20,
            }),
            prisma.notification.count({
              where: { orgId, userId, isRead: false },
            }),
          ]);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "init",
                notifications,
                unreadCount,
              })}\n\n`
            )
          );
        } catch (error) {
          console.error("[SSE] Init error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error" })}\n\n`)
          );
        }

        // Keep connection alive with heartbeats and check for new notifications
        let lastCheckTime = new Date();
        
        const poll = async () => {
          if (isAborted) {
            controller.close();
            return;
          }

          try {
            const [newNotifications, unreadCount] = await Promise.all([
              prisma.notification.findMany({
                where: {
                  orgId,
                  userId,
                  createdAt: { gt: lastCheckTime },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
              }),
              prisma.notification.count({
                where: { orgId, userId, isRead: false },
              }),
            ]);

            lastCheckTime = new Date();

            if (newNotifications.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "update",
                    notifications: newNotifications,
                    unreadCount,
                  })}\n\n`
                )
              );
            } else {
              // Send heartbeat with current unread count
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "heartbeat", unreadCount })}\n\n`
                )
              );
            }
          } catch (error) {
            console.error("[SSE] Poll error:", error);
          }

          // Continue polling every 5 seconds
          if (!isAborted) {
            setTimeout(poll, 5000);
          }
        };

        // Start polling after initial data
        setTimeout(poll, 5000);
      },

      cancel() {
        isAborted = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[SSE] Stream error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
