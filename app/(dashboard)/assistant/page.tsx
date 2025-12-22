"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { VoiceInput } from "@/components/voice/voice-input";
import {
  Send,
  StopCircle,
  Plus,
  Bot,
  User,
  Sparkles,
  MessageSquare,
  Loader2,
  CheckCircle2,
  PanelRightClose,
  PanelRightOpen,
  History,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AssistantPage() {
  const router = useRouter();
  const { can, loading: permissionsLoading } = usePermissions();
  
  const {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
    createSession,
    setCurrentSession,
    sessions,
    currentSessionId,
  } = useChat({
    onError: (error) => {
      toast.error(error.message);
    },
    onFinish: (toolsCalled) => {
      if (toolsCalled.length > 0) {
        toast.success(`Completed: ${toolsCalled.join(", ")}`);
        
        // Refresh to show updated data across the app
        setTimeout(() => {
          router.refresh();
        }, 500);
      }
    },
  });

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if user has AI Assistant access
  const hasAccess = can("ai_assistant", "view");

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("assistant-sidebar-open");
    if (savedState !== null) {
      setSidebarOpen(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem("assistant-sidebar-open", JSON.stringify(newState));
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (hasAccess) {
      inputRef.current?.focus();
    }
  }, [hasAccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  // Handle voice transcription
  const handleVoiceTranscript = (text: string) => {
    if (text.trim()) {
      // Automatically send the voice message
      sendMessage(text);
      toast.success("Voice command sent");
    }
  };

  const handleVoiceError = (error: string) => {
    toast.error(`Voice error: ${error}`);
  };

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  // Show access denied if user doesn't have permission
  if (!hasAccess) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="p-4 rounded-full bg-destructive/10 w-fit mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the AI Assistant. This feature is restricted to authorized users only.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Contact your administrator for access</span>
          </div>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">AI Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Manage your CRM with natural language
              </p>
            </div>
          </div>
          
          {/* Sidebar Toggle Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-9 w-9"
                >
                  {sidebarOpen ? (
                    <PanelRightClose className="h-5 w-5" />
                  ) : (
                    <PanelRightOpen className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {sidebarOpen ? "Hide chat history" : "Show chat history"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                How can I help you today?
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                I can help you manage leads, contacts, accounts, tasks, and
                opportunities. Try one of these or use voice input:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm max-w-2xl">
                {[
                  "Create a lead for John Smith at Acme Corp",
                  "Show me all my leads",
                  "Add a task to follow up with Sarah tomorrow",
                  "What are my dashboard stats?",
                  "Analyze my sales pipeline performance",
                  "Generate a report on lead conversion",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="p-3 rounded-lg border text-left hover:bg-muted/50 transition-colors"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                      {message.content === "Thinking..." ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content === "Thinking..." ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Processing your request...
                        </span>
                      ) : (
                        message.content
                      )}
                    </p>
                    {message.role === "assistant" &&
                      message.content !== "Thinking..." &&
                      (message.content.includes("Successfully") ||
                        message.content.includes("Created") ||
                        message.content.includes("Found")) && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Action completed
                        </div>
                      )}
                  </div>
                  {message.role === "user" && (
                    <div className="p-2 rounded-lg bg-muted h-fit">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or speak your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              onError={handleVoiceError}
              disabled={isLoading}
              size="default"
            />
            {isLoading ? (
              <Button
                type="button"
                variant="destructive"
                onClick={stopGeneration}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>
      </Card>

      {/* Right Sidebar - Chat History (Collapsible) */}
      <div
        className={cn(
          "flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          sidebarOpen ? "w-72 opacity-100" : "w-0 opacity-0"
        )}
      >
        <Card className="w-72 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" />
                Chat History
              </div>
            </div>
            <Button
              onClick={() => createSession()}
              className="w-full"
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Chat Sessions List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No conversations yet
                </p>
              ) : (
                <TooltipProvider delayDuration={300}>
                  {sessions.map((session) => (
                    <Tooltip key={session.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setCurrentSession(session.id)}
                          className={cn(
                            "w-full text-left p-2.5 rounded-lg transition-colors group",
                            "hover:bg-muted/50",
                            session.id === currentSessionId && "bg-muted"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium leading-snug line-clamp-2">
                                {session.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(session.updatedAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-sm">{session.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
