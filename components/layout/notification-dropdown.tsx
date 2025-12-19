"use client";

import Link from "next/link";
import { Bell, CheckCheck, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/components/providers/notification-provider";
import { useState } from "react";

export function NotificationDropdown() {
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // Get entity link based on type
  const getEntityLink = (notification: { entityType?: string | null; entityId?: string | null }) => {
    if (!notification.entityType || !notification.entityId) return null;

    const type = notification.entityType.toLowerCase();
    const id = notification.entityId;

    switch (type) {
      case "lead":
        return `/leads/${id}`;
      case "contact":
        return `/contacts/${id}`;
      case "account":
        return `/accounts/${id}`;
      case "task":
        return `/tasks/${id}`;
      case "opportunity":
        return `/opportunities/${id}`;
      case "ticket":
        return `/cs/tickets/${id}`;
      case "invoice":
        return `/sales/invoices/${id}`;
      case "renewal":
        return `/cs/renewals/${id}`;
      default:
        return null;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] font-medium text-white flex items-center justify-center animate-in zoom-in-50 duration-200">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Notifications</span>
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.slice(0, 10).map((notification) => {
              const link = getEntityLink(notification);
              const content = (
                <div
                  className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        !notification.isRead ? "font-medium" : ""
                      }`}
                    >
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
                  )}
                </div>
              );

              if (link) {
                return (
                  <Link key={notification.id} href={link} onClick={() => setIsOpen(false)}>
                    {content}
                  </Link>
                );
              }

              return <div key={notification.id}>{content}</div>;
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
