import { DEFAULT_BPM } from "./preferences.ts"

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

/** A beat starting at `time` on the clock, lasting `seconds`. */
export type Beat = { time: number; seconds: number }

export type BeatClock = {
  /**
   * Starts audio. Browsers only let audio start in response to a tap, click
   * or key press, so call this from the event handler before awaiting
   * anything. Gives nothing when audio isn't available.
   */
  startAudio(): AudioContext | undefined
  /** The started audio context, while audio works. */
  audio(): AudioContext | undefined
  setBpm(bpm: number): void
  /**
   * Calls `onBeat` shortly ahead of every beat, so sounds can be scheduled
   * for it, until the returned function is called. Starts audio, so call it
   * from an event handler too.
   */
  join(onBeat: (beat: Beat) => void): () => void
  /** Times beats without audio from now on, after audio has stopped working. */
  reportAudioFailure(): void
  onAudioFailure(callback: () => void): () => void
}

const schedulerIntervalMs = 25
const scheduleAheadSeconds = 0.1
// Leaves time for sounds that are set up asynchronously, like the piano's, to
// make the first beat.
const startDelaySeconds = 0.05

export function createBeatClock(): BeatClock {
  let bpm = DEFAULT_BPM
  let context: AudioContext | undefined
  let useFallbackClock = false
  let fallbackStartTime = 0
  let intervalId: number | undefined
  let nextBeatTime = 0
  const beatListeners = new Set<(beat: Beat) => void>()
  const failureListeners = new Set<() => void>()

  const fallbackCurrentTime = () =>
    (performance.now() - fallbackStartTime) / 1000
  const currentTime = () =>
    useFallbackClock
      ? fallbackCurrentTime()
      : (context?.currentTime ?? fallbackCurrentTime())

  const reportAudioFailure = () => {
    useFallbackClock = true
    for (const listener of failureListeners) {
      listener()
    }
  }

  const startAudio = () => {
    try {
      const AudioContextConstructor =
        window.AudioContext ?? window.webkitAudioContext
      if (!AudioContextConstructor) {
        reportAudioFailure()
      } else if (!context) {
        context = new AudioContextConstructor()
      }
      void context?.resume().catch(reportAudioFailure)
    } catch {
      reportAudioFailure()
    }
    return useFallbackClock ? undefined : context
  }

  const scheduler = () => {
    while (nextBeatTime <= currentTime() + scheduleAheadSeconds) {
      const beat = { time: nextBeatTime, seconds: 60 / bpm }
      for (const listener of beatListeners) {
        listener(beat)
      }
      nextBeatTime += beat.seconds
    }
  }

  const stopScheduler = () => {
    if (intervalId !== undefined) {
      window.clearInterval(intervalId)
      intervalId = undefined
    }
  }

  return {
    startAudio,
    audio() {
      return useFallbackClock ? undefined : context
    },
    setBpm(nextBpm: number) {
      bpm = nextBpm
    },
    join(onBeat: (beat: Beat) => void) {
      startAudio()
      beatListeners.add(onBeat)

      if (intervalId === undefined) {
        fallbackStartTime =
          performance.now() - (context?.currentTime ?? 0) * 1000
        nextBeatTime = currentTime() + startDelaySeconds
        scheduler()
        intervalId = window.setInterval(scheduler, schedulerIntervalMs)
      }

      return () => {
        beatListeners.delete(onBeat)
        if (beatListeners.size === 0) {
          stopScheduler()
        }
      }
    },
    reportAudioFailure,
    onAudioFailure(callback: () => void) {
      failureListeners.add(callback)
      return () => failureListeners.delete(callback)
    },
  }
}

/**
 * The app's audio and beats. Everything that plays shares it, so the piano
 * keeps time with the metronome, starting on its next click.
 */
export const beatClock = createBeatClock()
