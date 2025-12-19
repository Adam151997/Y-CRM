"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("[Notifications] Fetch error:", error);
    }
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      // Don't reconnect if we've exceeded max attempts
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.warn("[Notifications] Max reconnect attempts reached, falling back to polling");
        // Fall back to polling
        const pollInterval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(pollInterval);
      }

      eventSource = new EventSource("/api/notifications/stream");

      eventSource.onopen = () => {
        console.log("[Notifications] SSE connected");
        setIsConnected(true);
        reconnectAttempts = 0; // Reset on successful connection
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "init":
              // Initial data from SSE connection
              if (data.notifications) {
                setNotifications(data.notifications);
              }
              if (typeof data.unreadCount === "number") {
                setUnreadCount(data.unreadCount);
              }
              break;

            case "update":
              // New notifications received
              if (data.notifications && data.notifications.length > 0) {
                setNotifications((prev) => {
                  // Merge new notifications, avoiding duplicates
                  const existingIds = new Set(prev.map((n) => n.id));
                  const newOnes = data.notifications.filter(
                    (n: Notification) => !existingIds.has(n.id)
                  );
                  return [...newOnes, ...prev].slice(0, 50); // Keep max 50
                });
              }
              if (typeof data.unreadCount === "number") {
                setUnreadCount(data.unreadCount);
              }
              break;

            case "heartbeat":
              // Update unread count from heartbeat
              if (typeof data.unreadCount === "number") {
                setUnreadCount(data.unreadCount);
              }
              break;

            case "error":
              // SSE error, fall back to fetch
              fetchNotifications();
              break;
          }
        } catch (error) {
          console.error("[Notifications] Parse error:", error);
        }
      };

      eventSource.onerror = () => {
        console.warn("[Notifications] SSE error, reconnecting...");
        setIsConnected(false);
        eventSource?.close();

        // Exponential backoff for reconnection
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectTimeout = setTimeout(connect, delay);
      };
    };

    // Initial fetch before SSE connects
    fetchNotifications();

    // Start SSE connection
    connect();

    // Cleanup
    return () => {
      eventSource?.close();
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("[Notifications] Mark as read error:", error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("[Notifications] Mark all as read error:", error);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
