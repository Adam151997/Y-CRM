"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
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
  Zap,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function AssistantPage() {
  const router = useRouter();
  
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
    onFinish: (toolsCalled, modelUsed) => {
      const modelLabel = modelUsed.includes("2.5") ? "Pro" : "Flash";
      const modelIcon = modelUsed.includes("2.5") ? "🧠" : "⚡";
      
      if (toolsCalled.length > 0) {
        toast.success(`${modelIcon} ${modelLabel}: ${toolsCalled.join(", ")}`);
        
        // Refresh to show updated data across the app
        // Small delay to ensure server-side cache is invalidated
        setTimeout(() => {
          router.refresh();
        }, 500);
      } else {
        toast.info(`${modelIcon} Powered by Gemini ${modelLabel}`);
      }
    },
  });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar - Chat History */}
      <Card className="w-64 flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Button
            onClick={() => createSession()}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No conversations yet
              </p>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setCurrentSession(session.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50",
                    session.id === currentSessionId && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(session.updatedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span>Flash</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted">
              <Brain className="h-3 w-3 text-purple-500" />
              <span>Pro (auto)</span>
            </div>
          </div>
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
                  { text: "Create a lead for John Smith at Acme Corp", icon: "⚡" },
                  { text: "Show me all my leads", icon: "⚡" },
                  { text: "Add a task to follow up with Sarah tomorrow", icon: "⚡" },
                  { text: "What are my dashboard stats?", icon: "⚡" },
                  { text: "Analyze my sales pipeline performance", icon: "🧠" },
                  { text: "Generate a report on lead conversion", icon: "🧠" },
                ].map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="p-3 rounded-lg border text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="mr-2">{suggestion.icon}</span>
                    "{suggestion.text}"
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                ⚡ Fast (Gemini 2.0 Flash) • 🧠 Advanced (Gemini 2.5 Pro) • 🎤 Voice enabled
              </p>
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
          <p className="text-xs text-muted-foreground mt-2 text-center">
            ⚡ CRUD → Flash • 🧠 Analytics → Pro • 🎤 Click mic to speak
          </p>
        </div>
      </Card>
    </div>
  );
}
