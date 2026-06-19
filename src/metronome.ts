import { DEFAULT_BPM, MAX_BPM, MIN_BPM } from "./preferences.ts";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export type MetronomeEngine = {
  start(): void;
  stop(): void;
  setBpm(bpm: number): void;
  onPulse(callback: (beat: number) => void): () => void;
  onAudioError(callback: (message: string) => void): () => void;
  getAudioError(): string | undefined;
  dispose(): void;
};

const audioUnavailableMessage = "Audio click unavailable. Visual pulse is still active.";
const schedulerIntervalMs = 25;
const scheduleAheadSeconds = 0.1;

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BPM;
  }

  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

export function msPerBeat(bpm: number): number {
  return 60_000 / clampBpm(bpm);
}

export function createMetronomeEngine(initialBpm: number): MetronomeEngine {
  let bpm = clampBpm(initialBpm);
  let audioContext: AudioContext | undefined;
  let audioError: string | undefined;
  let intervalId: number | undefined;
  let nextBeatTime = 0;
  let fallbackStartTime = 0;
  let beat = 0;
  const listeners = new Set<(beat: number) => void>();
  const audioErrorListeners = new Set<(message: string) => void>();

  const currentTime = () => audioContext?.currentTime ?? (performance.now() - fallbackStartTime) / 1000;

  const emitPulse = () => {
    beat += 1;
    for (const listener of listeners) {
      listener(beat);
    }
  };

  const reportAudioError = () => {
    if (audioError === audioUnavailableMessage) {
      return;
    }

    audioError = audioUnavailableMessage;
    for (const listener of audioErrorListeners) {
      listener(audioUnavailableMessage);
    }
  };

  const scheduleClick = (time: number) => {
    if (!audioContext) {
      return;
    }

    try {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(0.4, time + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.05);
    } catch {
      reportAudioError();
    }
  };

  const scheduler = () => {
    while (nextBeatTime <= currentTime() + scheduleAheadSeconds) {
      scheduleClick(nextBeatTime);
      emitPulse();
      nextBeatTime += msPerBeat(bpm) / 1000;
    }
  };

  return {
    start() {
      if (intervalId !== undefined) {
        return;
      }

      try {
        const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContextConstructor) {
          reportAudioError();
        } else if (!audioContext) {
          audioContext = new AudioContextConstructor();
        }
        void audioContext?.resume().catch(reportAudioError);
      } catch {
        reportAudioError();
      }

      fallbackStartTime = performance.now();
      nextBeatTime = currentTime();
      scheduler();
      intervalId = window.setInterval(scheduler, schedulerIntervalMs);
    },
    stop() {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    },
    setBpm(nextBpm: number) {
      bpm = clampBpm(nextBpm);
    },
    onPulse(callback: (beat: number) => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    onAudioError(callback: (message: string) => void) {
      audioErrorListeners.add(callback);
      return () => audioErrorListeners.delete(callback);
    },
    getAudioError() {
      return audioError;
    },
    dispose() {
      this.stop();
      void audioContext?.close();
      listeners.clear();
      audioErrorListeners.clear();
    }
  };
}
