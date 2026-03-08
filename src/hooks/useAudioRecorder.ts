'use client';

/**
 * Audio Recorder Hook
 *
 * Manages the full recording lifecycle using MediaRecorder + Web Audio APIs.
 * Exposes an AnalyserNode for waveform visualization and tracks elapsed time.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupportedMimeType, AUDIO_CHUNK_INTERVAL } from '@/lib/utils/audio';

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

export interface UseAudioRecorderReturn {
  status: RecordingStatus;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob>;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null;
  elapsedSeconds: number;
  error: string | null;
  resetRecorder: () => void;
}

/**
 * Hook for in-browser audio recording.
 *
 * Features:
 * - Full lifecycle: idle -> recording -> paused -> stopped
 * - AnalyserNode exposed for waveform visualization
 * - Elapsed time tracking with pause/resume support
 * - Automatic microphone release on stop and unmount
 * - Graceful error handling for permission denied / no mic
 *
 * @example
 * const { status, startRecording, stopRecording, analyserNode, elapsedSeconds } = useAudioRecorder();
 * await startRecording();
 * // ... user records ...
 * const blob = await stopRecording();
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Releases all media resources: stops tracks, closes AudioContext, clears timer.
   */
  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        // Ignore close errors (already closed)
      });
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;
    setAnalyserNode(null);
  }, []);

  /**
   * Starts a timer that increments elapsedSeconds every second.
   */
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  /**
   * Pauses the timer.
   */
  const pauseTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API for waveform analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Resume if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      // Connect source to analyser only — NOT to destination (avoids feedback)
      source.connect(analyser);
      setAnalyserNode(analyser);

      // Create MediaRecorder with best available MIME type
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(AUDIO_CHUNK_INTERVAL);
      startTimer();
      setStatus('recording');
    } catch (err) {
      cleanup();
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access was denied. Please allow microphone permissions and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else {
          setError(`Microphone error: ${err.message}`);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while starting recording.');
      }
    }
  }, [cleanup, startTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.pause();
      pauseTimer();
      setStatus('paused');
    }
  }, [status, pauseTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'paused') {
      mediaRecorderRef.current.resume();
      startTimer();
      setStatus('recording');
    }
  }, [status, startTimer]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || (status !== 'recording' && status !== 'paused')) {
        reject(new Error('No active recording to stop.'));
        return;
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setStatus('stopped');
        cleanup();
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, [status, cleanup]);

  const resetRecorder = useCallback(() => {
    cleanup();
    setStatus('idle');
    setAudioBlob(null);
    setElapsedSeconds(0);
    setError(null);
    chunksRef.current = [];
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    audioBlob,
    analyserNode,
    elapsedSeconds,
    error,
    resetRecorder,
  };
}
