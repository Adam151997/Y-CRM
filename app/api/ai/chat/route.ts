import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { executeAgent } from "@/lib/ai/agent";
import { checkRateLimit, incrementUsage } from "@/lib/rate-limit";
import { CoreMessage } from "ai";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/ai/chat
 * AI chat endpoint with tool support
 */
export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("[AI Chat] GOOGLE_GENERATIVE_AI_API_KEY is not set");
      return NextResponse.json(
        {
          error: "AI not configured",
          details: "Please add GOOGLE_GENERATIVE_AI_API_KEY to your .env.local file",
        },
        { status: 503 }
      );
    }

    // Authenticate
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(auth.orgId, "AI_CALL");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { messages: rawMessages } = body as { 
      messages: CoreMessage[]; 
    };

    if (!rawMessages || !Array.isArray(rawMessages)) {
      return NextResponse.json(
        { error: "Messages array required" },
        { status: 400 }
      );
    }

    // Filter and clean messages - Gemini requires non-empty content
    const messages = rawMessages
      .filter((m) => {
        // Must have content
        if (!m.content) return false;
        // If string, must not be empty or just "Thinking..."
        if (typeof m.content === "string") {
          const trimmed = m.content.trim();
          return trimmed.length > 0 && trimmed !== "Thinking...";
        }
        // If array, must have at least one item
        if (Array.isArray(m.content)) {
          return m.content.length > 0;
        }
        return true;
      }) as CoreMessage[];

    // Ensure we have at least one message
    if (messages.length === 0) {
      return NextResponse.json(
        { error: "No valid messages provided" },
        { status: 400 }
      );
    }

    console.log("[AI Chat] Processing", messages.length, "valid messages");
    console.log("[AI Chat] Auth context:", { orgId: auth.orgId, userId: auth.userId });

    // Generate request ID for tracing
    const requestId = crypto.randomUUID();

    // Execute the agent
    const result = await executeAgent(messages, {
      orgId: auth.orgId,
      userId: auth.userId,
      requestId,
    });

    console.log("[AI Chat] Agent result:", {
      success: result.success,
      model: result.modelUsed,
      toolsCalled: result.toolsCalled,
      toolResultsCount: result.toolResults?.length || 0,
      responsePreview: result.response?.substring(0, 200),
    });

    // Increment usage counter
    incrementUsage(auth.orgId, auth.userId, "AI_CALL").catch(console.error);

    // Return the result
    return NextResponse.json({
      success: result.success,
      response: result.response,
      toolsCalled: result.toolsCalled,
      toolResults: result.toolResults, // Include tool results for context
      modelUsed: result.modelUsed,
      error: result.error,
    });
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
