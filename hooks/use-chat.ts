"use client";

import { useCallback, useRef } from "react";
import { useChatStore } from "@/lib/stores/chat-store";

interface UseChatOptions {
  onError?: (error: Error) => void;
  onFinish?: (toolsCalled: string[], modelUsed: string) => void;
}

interface AIResponse {
  success: boolean;
  response: string;
  toolsCalled: string[];
  toolResults?: Record<string, unknown>[];
  modelUsed: string;
  error?: string;
}

export function useChat(options: UseChatOptions = {}) {
  const {
    currentSessionId,
    sessions,
    isLoading,
    createSession,
    setCurrentSession,
    addMessage,
    updateLastMessage,
    setLoading,
    setError,
    getCurrentMessages,
  } = useChatStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, modelType?: "fast" | "advanced") => {
      if (!content.trim() || isLoading) return;

      // Ensure we have a session
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = createSession();
      }

      // Add user message
      addMessage({ role: "user", content });

      // Add "thinking" assistant message (for UI only, not sent to API)
      addMessage({ role: "assistant", content: "Thinking..." });

      setLoading(true);
      setError(null);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Set a timeout of 120 seconds
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          updateLastMessage("Request timed out. Please try again.");
          setLoading(false);
        }
      }, 120000);

      try {
        // Get current messages and filter for API
        const messages = getCurrentMessages();
        
        // Collect previous tool results for context
        const previousToolContext: string[] = [];
        messages.forEach((m) => {
          if (m.toolCalls && m.toolCalls.length > 0) {
            m.toolCalls.forEach((tc) => {
              if (tc.result) {
                const result = tc.result as Record<string, unknown>;
                // Extract IDs for context
                if (result.leadId) previousToolContext.push(`Created lead with ID: ${result.leadId}`);
                if (result.contactId) previousToolContext.push(`Created contact with ID: ${result.contactId}`);
                if (result.accountId) previousToolContext.push(`Created account with ID: ${result.accountId}`);
                if (result.taskId) previousToolContext.push(`Created task with ID: ${result.taskId}`);
                if (result.opportunityId) previousToolContext.push(`Created opportunity with ID: ${result.opportunityId}`);
              }
            });
          }
        });
        
        // Filter out empty messages and "Thinking..." placeholder
        // Only send user messages and completed assistant messages
        const apiMessages = messages
          .filter((m) => {
            if (!m.content || m.content.trim() === "") return false;
            if (m.content === "Thinking...") return false;
            if (m.content.startsWith("Error:")) return false;
            return true;
          })
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        
        // If we have previous tool context, add it to the first user message or prepend
        if (previousToolContext.length > 0 && apiMessages.length > 0) {
          const contextNote = `[Context from previous actions: ${previousToolContext.join(", ")}]\n\n`;
          // Find the last user message and prepend context
          const lastUserMsgIndex = apiMessages.findIndex((m, i) => 
            m.role === "user" && i === apiMessages.length - 1 || 
            (m.role === "user" && apiMessages[i + 1]?.role !== "user")
          );
          if (lastUserMsgIndex >= 0 && apiMessages[lastUserMsgIndex].role === "user") {
            // Don't modify if context is already there
            if (!apiMessages[apiMessages.length - 1].content.startsWith("[Context")) {
              apiMessages[apiMessages.length - 1] = {
                ...apiMessages[apiMessages.length - 1],
                content: contextNote + apiMessages[apiMessages.length - 1].content,
              };
            }
          }
        }

        // Ensure we have at least the current user message
        if (apiMessages.length === 0) {
          apiMessages.push({ role: "user", content });
        }

        console.log("[useChat] Sending", apiMessages.length, "messages to API");

        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, modelType }),
          signal: abortControllerRef.current.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = "Failed to get response";
          try {
            const error = await response.json();
            errorMessage = error.details || error.error || errorMessage;
          } catch {
            // Ignore parse error
          }
          throw new Error(errorMessage);
        }

        // Parse JSON response
        const data: AIResponse = await response.json();

        if (data.success) {
          // Store tool results with the message for future context
          const toolCallsWithResults = data.toolsCalled.map((toolName, idx) => ({
            toolName,
            result: data.toolResults?.[idx],
          }));
          
          // Update the message with response and tool results
          const { sessions, currentSessionId } = useChatStore.getState();
          useChatStore.setState({
            sessions: sessions.map((session) =>
              session.id === currentSessionId
                ? {
                    ...session,
                    messages: session.messages.map((msg, idx) =>
                      idx === session.messages.length - 1
                        ? { ...msg, content: data.response, toolCalls: toolCallsWithResults }
                        : msg
                    ),
                    updatedAt: new Date(),
                  }
                : session
            ),
          });
          
          options.onFinish?.(data.toolsCalled, data.modelUsed);
        } else {
          throw new Error(data.error || data.response || "Unknown error");
        }
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        setError(errorMessage);
        updateLastMessage(`Error: ${errorMessage}`);
        options.onError?.(
          error instanceof Error ? error : new Error(errorMessage)
        );
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      currentSessionId,
      isLoading,
      createSession,
      addMessage,
      updateLastMessage,
      setLoading,
      setError,
      getCurrentMessages,
      options,
    ]
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [setLoading]);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return {
    messages: currentSession?.messages || [],
    isLoading,
    sendMessage,
    stopGeneration,
    createSession,
    setCurrentSession,
    sessions,
    currentSessionId,
  };
}
