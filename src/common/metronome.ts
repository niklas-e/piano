import { type BeatClock, beatClock } from "./beatClock.ts"
import { DEFAULT_BPM, MAX_BPM, MIN_BPM } from "./preferences.ts"

export type MetronomeEngine = {
  start(): void
  stop(): void
  setBpm(bpm: number): void
  onPulse(callback: (beat: number) => void): () => void
  onAudioError(callback: (message: string) => void): () => void
  getAudioError(): string | undefined
  dispose(): void
}

const audioUnavailableMessage =
  "Audio click unavailable. Visual pulse is still active."

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BPM
  }

  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)))
}

export function msPerBeat(bpm: number): number {
  return 60_000 / clampBpm(bpm)
}

export const TAP_RESET_GAP_MS = 2000
const TAP_AVERAGE_INTERVALS = 4

export function tapTempoBpm(timestamps: number[]): number | null {
  if (timestamps.length < 2) {
    return null
  }

  let runStart = 0
  for (let i = 1; i < timestamps.length; i += 1) {
    if (timestamps[i] - timestamps[i - 1] > TAP_RESET_GAP_MS) {
      runStart = i
    }
  }

  const run = timestamps.slice(runStart)
  if (run.length < 2) {
    return null
  }

  const intervals: number[] = []
  for (let i = 1; i < run.length; i += 1) {
    intervals.push(run[i] - run[i - 1])
  }

  const recent = intervals.slice(-TAP_AVERAGE_INTERVALS)
  const average = recent.reduce((sum, value) => sum + value, 0) / recent.length
  if (average <= 0) {
    return null
  }

  return clampBpm(60_000 / average)
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/** Clicks on the beats of `clock`, and sets its tempo for everything else on it. */
export function createMetronomeEngine(
  initialBpm: number,
  clock: BeatClock = beatClock,
): MetronomeEngine {
  let audioError: string | undefined
  let leaveClock: (() => void) | undefined
  let beat = 0
  const listeners = new Set<(beat: number) => void>()
  const audioErrorListeners = new Set<(message: string) => void>()

  clock.setBpm(clampBpm(initialBpm))

  const emitPulse = () => {
    beat += 1
    for (const listener of listeners) {
      listener(beat)
    }
  }

  const reportAudioError = () => {
    if (audioError === audioUnavailableMessage) {
      return
    }

    audioError = audioUnavailableMessage
    for (const listener of audioErrorListeners) {
      listener(audioUnavailableMessage)
    }
  }
  const stopWatchingAudio = clock.onAudioFailure(reportAudioError)

  const scheduleClick = (time: number) => {
    const audioContext = clock.audio()
    if (!audioContext) {
      return
    }

    try {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.001, time)
      gain.gain.exponentialRampToValueAtTime(0.4, time + 0.002)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045)
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start(time)
      oscillator.stop(time + 0.05)
    } catch {
      clock.reportAudioFailure()
    }
  }

  return {
    start() {
      if (leaveClock !== undefined) {
        return
      }

      leaveClock = clock.join(({ time }) => {
        scheduleClick(time)
        emitPulse()
      })
    },
    stop() {
      leaveClock?.()
      leaveClock = undefined
    },
    setBpm(nextBpm: number) {
      clock.setBpm(clampBpm(nextBpm))
    },
    onPulse(callback: (beat: number) => void) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    onAudioError(callback: (message: string) => void) {
      audioErrorListeners.add(callback)
      return () => audioErrorListeners.delete(callback)
    },
    getAudioError() {
      return audioError
    },
    dispose() {
      this.stop()
      stopWatchingAudio()
      listeners.clear()
      audioErrorListeners.clear()
    },
  }
}
