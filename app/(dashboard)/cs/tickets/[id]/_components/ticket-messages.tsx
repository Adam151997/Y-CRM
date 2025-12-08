"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User, Bot, Lock } from "lucide-react";

interface Message {
  id: string;
  content: string;
  contentHtml: string | null;
  isInternal: boolean;
  authorId: string;
  authorType: string;
  authorName: string | null;
  createdAt: Date;
}

interface TicketMessagesProps {
  messages: Message[];
}

export function TicketMessages({ messages }: TicketMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No messages yet. Start the conversation below.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isAgent = message.authorType === "USER" || message.authorType === "AI_AGENT";
        const isAI = message.authorType === "AI_AGENT";
        
        // Get initials for avatar
        const getInitials = () => {
          if (isAI) return "AI";
          if (message.authorName) {
            const parts = message.authorName.split(" ");
            return parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
          }
          return isAgent ? "AG" : "CU";
        };

        return (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 p-4 rounded-lg",
              message.isInternal 
                ? "bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800" 
                : isAgent
                  ? "bg-muted/50"
                  : "bg-blue-50 dark:bg-blue-950/20"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback 
                className={cn(
                  "text-xs",
                  isAI 
                    ? "bg-violet-100 text-violet-700" 
                    : isAgent 
                      ? "bg-primary/10 text-primary"
                      : "bg-blue-100 text-blue-700"
                )}
              >
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {message.authorName || (isAgent ? "Support Agent" : "Customer")}
                </span>
                
                {isAI && (
                  <Badge variant="secondary" className="text-xs">
                    <Bot className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                )}
                
                {message.isInternal && (
                  <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                    <Lock className="h-3 w-3 mr-1" />
                    Internal Note
                  </Badge>
                )}
                
                <span className="text-xs text-muted-foreground">
                  {format(new Date(message.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              
              {message.contentHtml ? (
                <div 
                  className="text-sm prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: message.contentHtml }}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
