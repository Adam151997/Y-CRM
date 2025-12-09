/**
 * Voice Transcription Service
 * Uses OpenAI Whisper API for speech-to-text
 */

import OpenAI from "openai";

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
  duration?: number;
  language?: string;
}

export interface TranscriptionOptions {
  language?: string; // ISO 639-1 code (e.g., "en", "es")
  prompt?: string; // Context to improve accuracy
  temperature?: number; // 0-1, lower = more deterministic
}

/**
 * Transcribe audio using OpenAI Whisper
 */
export async function transcribeAudio(
  audioFile: File | Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    const startTime = Date.now();
    const openai = getOpenAIClient();

    // Convert Blob to File if needed
    const file = audioFile instanceof File 
      ? audioFile 
      : new File([audioFile], "recording.webm", { type: audioFile.type });

    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: options.language,
      prompt: options.prompt,
      temperature: options.temperature ?? 0,
      response_format: "json",
    });

    const duration = Date.now() - startTime;

    return {
      success: true,
      text: response.text,
      duration,
      language: options.language,
    };
  } catch (error) {
    console.error("[Voice] Transcription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transcription failed",
    };
  }
}

/**
 * Transcribe audio from base64 data
 */
export async function transcribeBase64Audio(
  base64Data: string,
  mimeType: string = "audio/webm",
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    // Convert base64 to Blob
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    return transcribeAudio(blob, options);
  } catch (error) {
    console.error("[Voice] Base64 conversion error:", error);
    return {
      success: false,
      error: "Failed to process audio data",
    };
  }
}

/**
 * CRM-specific prompt for better transcription accuracy
 */
export function getCRMTranscriptionPrompt(workspace?: string): string {
  const baseTerms = [
    "CRM", "lead", "contact", "account", "opportunity", "pipeline",
    "task", "note", "follow-up", "meeting", "call", "email",
  ];

  const workspaceTerms: Record<string, string[]> = {
    sales: [
      "prospect", "qualified", "converted", "deal", "revenue",
      "close date", "probability", "stage", "won", "lost",
    ],
    cs: [
      "ticket", "support", "health score", "at risk", "playbook",
      "onboarding", "renewal", "churn", "NPS", "resolution",
    ],
    marketing: [
      "campaign", "segment", "form", "conversion", "audience",
      "email campaign", "webinar", "event", "ROI", "engagement",
    ],
  };

  const terms = [
    ...baseTerms,
    ...(workspace ? workspaceTerms[workspace] || [] : Object.values(workspaceTerms).flat()),
  ];

  return `CRM system commands. Common terms: ${terms.join(", ")}.`;
}
