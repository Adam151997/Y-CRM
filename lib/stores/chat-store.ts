import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  toolCalls?: {
    toolName: string;
    result?: unknown;
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatStore {
  // Current session
  currentSessionId: string | null;
  sessions: ChatSession[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createSession: () => string;
  setCurrentSession: (sessionId: string) => void;
  addMessage: (message: Omit<Message, "id" | "createdAt">) => void;
  updateLastMessage: (content: string) => void;
  clearCurrentSession: () => void;
  deleteSession: (sessionId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Getters
  getCurrentSession: () => ChatSession | null;
  getCurrentMessages: () => Message[];
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      sessions: [],
      isLoading: false,
      error: null,

      createSession: () => {
        const sessionId = crypto.randomUUID();
        const newSession: ChatSession = {
          id: sessionId,
          title: "New Chat",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: sessionId,
        }));

        return sessionId;
      },

      setCurrentSession: (sessionId) => {
        set({ currentSessionId: sessionId });
      },

      addMessage: (message) => {
        const { currentSessionId, sessions } = get();
        if (!currentSessionId) return;

        const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };

        set({
          sessions: sessions.map((session) =>
            session.id === currentSessionId
              ? {
                  ...session,
                  messages: [...session.messages, newMessage],
                  updatedAt: new Date(),
                  // Update title from first user message
                  title:
                    session.messages.length === 0 && message.role === "user"
                      ? message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "")
                      : session.title,
                }
              : session
          ),
        });
      },

      updateLastMessage: (content) => {
        const { currentSessionId, sessions } = get();
        if (!currentSessionId) return;

        set({
          sessions: sessions.map((session) =>
            session.id === currentSessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg, idx) =>
                    idx === session.messages.length - 1
                      ? { ...msg, content }
                      : msg
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        });
      },

      clearCurrentSession: () => {
        const { currentSessionId, sessions } = get();
        if (!currentSessionId) return;

        set({
          sessions: sessions.map((session) =>
            session.id === currentSessionId
              ? { ...session, messages: [], updatedAt: new Date() }
              : session
          ),
        });
      },

      deleteSession: (sessionId) => {
        const { currentSessionId, sessions } = get();
        const newSessions = sessions.filter((s) => s.id !== sessionId);

        set({
          sessions: newSessions,
          currentSessionId:
            currentSessionId === sessionId
              ? newSessions[0]?.id || null
              : currentSessionId,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      getCurrentSession: () => {
        const { currentSessionId, sessions } = get();
        return sessions.find((s) => s.id === currentSessionId) || null;
      },

      getCurrentMessages: () => {
        const session = get().getCurrentSession();
        return session?.messages || [];
      },
    }),
    {
      name: "y-crm-chat",
      partialize: (state) => ({
        sessions: state.sessions.slice(0, 20), // Keep last 20 sessions
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
