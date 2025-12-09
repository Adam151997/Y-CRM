/**
 * Voice Transcription API
 * POST /api/voice/transcribe - Transcribe audio using Whisper
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { transcribeAudio, getCRMTranscriptionPrompt } from "@/lib/voice/transcription";
import { createAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 30; // 30 second timeout

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get workspace from header for better transcription
    const workspace = request.headers.get("X-Workspace") || undefined;

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB for Whisper)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Audio file too large. Maximum size is 25MB." },
        { status: 400 }
      );
    }

    // Transcribe
    const result = await transcribeAudio(audioFile, {
      prompt: getCRMTranscriptionPrompt(workspace),
      temperature: 0,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Log voice command
    await createAuditLog({
      orgId: auth.orgId,
      action: "VOICE_COMMAND",
      module: "SYSTEM",
      actorType: "USER",
      actorId: auth.userId,
      metadata: {
        workspace,
        transcript: result.text,
        duration: result.duration,
        audioSize: audioFile.size,
      },
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      duration: result.duration,
    });

  } catch (error) {
    console.error("[Voice API] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Transcription failed" 
      },
      { status: 500 }
    );
  }
}
