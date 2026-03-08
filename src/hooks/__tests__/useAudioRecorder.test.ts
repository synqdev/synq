/**
 * Unit tests for useAudioRecorder hook.
 *
 * Mocks browser MediaRecorder, AudioContext, and getUserMedia APIs
 * to test the full recording lifecycle without hardware access.
 */

import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from '../useAudioRecorder';

// --- Mock factories ---

function createMockTrack() {
  return { stop: jest.fn(), kind: 'audio' };
}

function createMockStream() {
  const tracks = [createMockTrack()];
  return {
    getTracks: () => tracks,
    _tracks: tracks,
  } as unknown as MediaStream;
}

let mockMediaRecorderInstance: {
  start: jest.Mock;
  stop: jest.Mock;
  pause: jest.Mock;
  resume: jest.Mock;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  state: string;
  mimeType: string;
};

function createMockMediaRecorder() {
  mockMediaRecorderInstance = {
    start: jest.fn(() => {
      mockMediaRecorderInstance.state = 'recording';
    }),
    stop: jest.fn(() => {
      mockMediaRecorderInstance.state = 'inactive';
      // Simulate ondataavailable then onstop
      if (mockMediaRecorderInstance.ondataavailable) {
        mockMediaRecorderInstance.ondataavailable({
          data: new Blob(['audio-data'], { type: 'audio/webm;codecs=opus' }),
        });
      }
      if (mockMediaRecorderInstance.onstop) {
        mockMediaRecorderInstance.onstop();
      }
    }),
    pause: jest.fn(() => {
      mockMediaRecorderInstance.state = 'paused';
    }),
    resume: jest.fn(() => {
      mockMediaRecorderInstance.state = 'recording';
    }),
    ondataavailable: null,
    onstop: null,
    state: 'inactive',
    mimeType: 'audio/webm;codecs=opus',
  };
  return mockMediaRecorderInstance;
}

const mockAnalyser = {
  fftSize: 0,
  connect: jest.fn(),
  disconnect: jest.fn(),
  frequencyBinCount: 1024,
};

const mockAudioContext = {
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  createAnalyser: jest.fn(() => mockAnalyser),
  resume: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve()),
  state: 'running' as string,
};

// --- Global mocks ---

let mockStream: MediaStream;

beforeEach(() => {
  jest.useFakeTimers();

  mockStream = createMockStream();

  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn(() => Promise.resolve(mockStream)),
    },
    writable: true,
    configurable: true,
  });

  // Reset AudioContext mock state
  mockAudioContext.state = 'running';
  mockAudioContext.close.mockClear();
  mockAudioContext.resume.mockClear();
  mockAudioContext.createMediaStreamSource.mockClear();
  mockAudioContext.createAnalyser.mockClear();
  mockAnalyser.connect.mockClear();

  global.AudioContext = jest.fn(() => mockAudioContext) as unknown as typeof AudioContext;

  global.MediaRecorder = jest.fn(() => createMockMediaRecorder()) as unknown as typeof MediaRecorder;
  (global.MediaRecorder as unknown as Record<string, unknown>).isTypeSupported = jest.fn(
    (type: string) => type === 'audio/webm;codecs=opus'
  );
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// --- Tests ---

describe('useAudioRecorder', () => {
  it('has correct initial state', () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.status).toBe('idle');
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.analyserNode).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('starts recording and exposes analyserNode', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.status).toBe('recording');
    expect(result.current.analyserNode).not.toBeNull();
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it('pauses and resumes recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.pauseRecording();
    });
    expect(result.current.status).toBe('paused');
    expect(mockMediaRecorderInstance.pause).toHaveBeenCalled();

    act(() => {
      result.current.resumeRecording();
    });
    expect(result.current.status).toBe('recording');
    expect(mockMediaRecorderInstance.resume).toHaveBeenCalled();
  });

  it('stops recording and returns blob', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    let blob: Blob | undefined;
    await act(async () => {
      blob = await result.current.stopRecording();
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(result.current.status).toBe('stopped');
    expect(result.current.audioBlob).not.toBeNull();

    // Stream tracks should be stopped
    const tracks = mockStream.getTracks();
    expect(tracks[0].stop).toHaveBeenCalled();

    // AudioContext should be closed
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it('handles getUserMedia NotAllowedError', async () => {
    const permError = new DOMException('Permission denied', 'NotAllowedError');
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(permError);

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toContain('denied');
  });

  it('resets state after recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.status).toBe('stopped');
    expect(result.current.audioBlob).not.toBeNull();

    act(() => {
      result.current.resetRecorder();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('cleans up on unmount during recording', async () => {
    const { result, unmount } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    // The mock sets state to 'recording' on start
    expect(mockMediaRecorderInstance.state).toBe('recording');

    act(() => {
      unmount();
    });

    // Stream tracks should be stopped
    const tracks = mockStream.getTracks();
    expect(tracks[0].stop).toHaveBeenCalled();

    // AudioContext should be closed
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it('tracks elapsed seconds and pauses timer', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    // Advance 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.elapsedSeconds).toBe(3);

    // Pause — timer should stop
    act(() => {
      result.current.pauseRecording();
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    // Should still be 3 after pause
    expect(result.current.elapsedSeconds).toBe(3);

    // Resume — timer should continue
    act(() => {
      result.current.resumeRecording();
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.elapsedSeconds).toBe(5);
  });
});
