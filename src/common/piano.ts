import { cat } from "@strudel/core"
import {
  getSampleBuffer,
  type SoundValue,
  samples,
  setAudioContext,
  setLogger,
  superdough,
} from "superdough"
import type { Beat, BeatClock } from "./beatClock"
import { NOTE_NAMES } from "./exercises"

// Superdough logs every sample it loads and some notes of its own, which
// only matter when working on the sound itself.
setLogger((message) => console.debug(message))

/**
 * Salamander Grand Piano recordings, one every minor third from A0 to C8.
 * Superdough repitches the nearest one for the keys in between.
 */
const pianoSamples: Record<string, string[]> = {}
for (let midi = 21; midi <= 108; midi += 3) {
  const note = `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
  pianoSamples[note] = [
    `${import.meta.env.BASE_URL}samples/piano/${note.replace("#", "s")}.mp3`,
  ]
}

/** Seconds a key keeps sounding after its beat, like lifting a finger. */
const release = 0.3
/** Seconds a single note is held, long enough to hear it out. */
const singleNoteSeconds = 1
// Superdough skips a note whose time has passed by the time it's set up.
const singleNoteDelaySeconds = 0.05

type Step = SoundValue & { position: number }

export type Playback = { stop(): void }

let preparedContext: AudioContext | undefined

/** Starts audio and loads the samples `notes` need, ready to play them. */
async function loadPiano(
  clock: BeatClock,
  notes: readonly string[],
): Promise<AudioContext> {
  const context = clock.startAudio()
  if (!context) {
    throw new Error("Audio isn't available")
  }
  if (preparedContext !== context) {
    setAudioContext(context)
    await samples({ piano: pianoSamples })
    preparedContext = context
  }
  // Superdough skips a note whose sample is still loading when it's due.
  await Promise.all(
    notes.map((note) => getSampleBuffer({ note }, pianoSamples)),
  )
  return context
}

/**
 * Plays `notes`, such as "C#4", on a piano at one note per beat of `clock`, so
 * they keep time with the metronome. `onNote` is called with each note's
 * position as it sounds, and with nothing once the last one has finished or
 * playback is stopped.
 */
export async function playNotes(
  clock: BeatClock,
  notes: readonly string[],
  onNote: (position: number | undefined) => void,
): Promise<Playback> {
  const context = await loadPiano(clock, notes)

  const timers = new Set<number>()
  const at = (time: number, action: () => void) => {
    const delayMs = Math.max(0, time - context.currentTime) * 1000
    const timer = window.setTimeout(() => {
      timers.delete(timer)
      action()
    }, delayMs)
    timers.add(timer)
  }

  // A cycle of the pattern is a beat.
  const pattern = cat(
    ...notes.map(
      (note, position): Step => ({ s: "piano", note, release, position }),
    ),
  )
  let cycle = 0
  const onBeat = ({ time, seconds }: Beat) => {
    if (cycle === notes.length) {
      leaveClock()
      at(time, stop)
      return
    }

    for (const hap of pattern.queryArc(cycle, cycle + 1)) {
      if (!hap.whole || !hap.hasOnset()) {
        continue
      }
      const { position, ...sound } = hap.value
      const start = time + (Number(hap.whole.begin) - cycle) * seconds
      void superdough(sound, start, Number(hap.duration) * seconds, 1 / seconds)
      at(start, () => onNote(position))
    }
    cycle += 1
  }
  const leaveClock = clock.join(onBeat)

  const stop = () => {
    leaveClock()
    for (const timer of timers) {
      window.clearTimeout(timer)
    }
    timers.clear()
    onNote(undefined)
  }

  return { stop }
}

/** Plays one note, such as "Db4", on the piano straight away. */
export async function playNote(clock: BeatClock, note: string): Promise<void> {
  const context = await loadPiano(clock, [note])
  await superdough(
    { s: "piano", note, release },
    context.currentTime + singleNoteDelaySeconds,
    singleNoteSeconds,
    1,
  )
}
