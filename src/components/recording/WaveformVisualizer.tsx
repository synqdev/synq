'use client';

/**
 * Waveform Visualizer
 *
 * Renders a canvas-based real-time waveform from an AnalyserNode.
 * When active, uses requestAnimationFrame to draw time-domain audio data.
 * When idle, draws a flat center line.
 */

import { useCallback, useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
}

export function WaveformVisualizer({ analyserNode, isActive }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const drawIdleLine = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.fillStyle = 'rgb(30, 41, 59)';
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.strokeStyle = 'rgb(94, 234, 212)';
    ctx.lineWidth = 2;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    // Reuse the same buffer across frames to avoid per-frame GC pressure
    if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
      dataArrayRef.current = new Uint8Array(bufferLength);
    }
    const dataArray = dataArrayRef.current;
    analyserNode.getByteTimeDomainData(dataArray);

    const { width, height } = canvas;

    ctx.fillStyle = 'rgb(30, 41, 59)';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(94, 234, 212)';
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();

    animationIdRef.current = requestAnimationFrame(draw);
  }, [analyserNode]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        canvas.width = width;
        canvas.height = 80;

        if (!isActive) {
          drawIdleLine(canvas);
        }
      }
    });

    observer.observe(canvas);

    // Initial sizing
    canvas.width = canvas.clientWidth;
    canvas.height = 80;

    return () => observer.disconnect();
  }, [isActive, drawIdleLine]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isActive && analyserNode) {
      animationIdRef.current = requestAnimationFrame(draw);
    } else {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      drawIdleLine(canvas);
    }

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [isActive, analyserNode, draw, drawIdleLine]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ height: '80px' }}
    />
  );
}
