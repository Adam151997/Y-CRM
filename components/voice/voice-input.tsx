"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Square } from "lucide-react";
import { useVoiceRecorder } from "@/lib/voice/use-voice-recorder";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function VoiceInput({
  onTranscript,
  onError,
  disabled = false,
  className,
  size = "default",
}: VoiceInputProps) {
  const {
    isRecording,
    isProcessing,
    duration,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder({
    maxDuration: 60,
    onTranscript,
    onError,
  });

  const handleClick = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate pulse scale based on audio level
  const pulseScale = 1 + (audioLevel / 100) * 0.3;

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="font-mono text-muted-foreground">
            {formatDuration(duration)}
          </span>
        </div>
      )}

      {/* Main button */}
      <div className="relative">
        {/* Pulse animation background */}
        {isRecording && (
          <div
            className="absolute inset-0 rounded-full bg-red-500/20 transition-transform duration-100"
            style={{ transform: `scale(${pulseScale})` }}
          />
        )}

        <Button
          type="button"
          variant={isRecording ? "destructive" : "outline"}
          size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
          onClick={handleClick}
          disabled={disabled || isProcessing}
          className={cn(
            "relative z-10",
            isRecording && "animate-pulse",
            size === "sm" && "h-8 w-8 p-0",
            size === "default" && "h-10 w-10 p-0",
            size === "lg" && "h-12 w-12 p-0"
          )}
        >
          {isProcessing ? (
            <Loader2 className={cn(
              "animate-spin",
              size === "sm" && "h-4 w-4",
              size === "default" && "h-5 w-5",
              size === "lg" && "h-6 w-6"
            )} />
          ) : isRecording ? (
            <Square className={cn(
              size === "sm" && "h-3 w-3",
              size === "default" && "h-4 w-4",
              size === "lg" && "h-5 w-5"
            )} />
          ) : (
            <Mic className={cn(
              size === "sm" && "h-4 w-4",
              size === "default" && "h-5 w-5",
              size === "lg" && "h-6 w-6"
            )} />
          )}
        </Button>
      </div>

      {/* Cancel button (during recording) */}
      {isRecording && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancelRecording}
          className="text-muted-foreground"
        >
          <MicOff className="h-4 w-4" />
        </Button>
      )}

      {/* Error display */}
      {error && !isRecording && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </div>
  );
}

/**
 * Inline voice input for text fields
 */
interface VoiceInputInlineProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputInline({ onTranscript, disabled }: VoiceInputInlineProps) {
  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
  } = useVoiceRecorder({
    maxDuration: 30,
    onTranscript,
  });

  const handleClick = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        isRecording 
          ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
        (disabled || isProcessing) && "opacity-50 cursor-not-allowed"
      )}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <div className="relative">
          <Square className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
