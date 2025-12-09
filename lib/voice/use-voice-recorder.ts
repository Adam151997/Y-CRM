"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseVoiceRecorderOptions {
  maxDuration?: number; // Max recording duration in seconds (default: 60)
  sampleRate?: number; // Audio sample rate (default: 16000)
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  audioLevel: number; // 0-100 for visualization
  error: string | null;
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const {
    maxDuration = 60,
    onTranscript,
    onError,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setAudioLevel(0);
    setDuration(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Audio level analyzer
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(Math.min(100, Math.round((average / 255) * 100)));

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      
      streamRef.current = stream;

      // Set up audio analysis for visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Determine best supported format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start duration timer
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDuration(elapsed);
        
        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);

      // Start audio level updates
      updateAudioLevel();

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access microphone";
      setError(message);
      onError?.(message);
    }
  }, [maxDuration, onError, updateAudioLevel]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    setIsProcessing(true);

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType,
          });

          // Send to transcription API
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Transcription failed");
          }

          const result = await response.json();
          
          if (result.success && result.text) {
            onTranscript?.(result.text);
            resolve(result.text);
          } else {
            throw new Error(result.error || "No transcription returned");
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Transcription failed";
          setError(message);
          onError?.(message);
          resolve(null);
        } finally {
          cleanup();
          setIsRecording(false);
          setIsProcessing(false);
        }
      };

      mediaRecorder.stop();
    });
  }, [isRecording, cleanup, onTranscript, onError]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setIsRecording(false);
    setIsProcessing(false);
  }, [isRecording, cleanup]);

  return {
    isRecording,
    isProcessing,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    audioLevel,
    error,
  };
}
