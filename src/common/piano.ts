import { Cyclist, cat, sequence, silence } from "@strudel/core"
import {
  getSampleBuffer,
  type SoundValue,
  samples,
  setAudioContext,
  setLogger,
  superdough,
} from "superdough"
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

type Step = SoundValue & { position: number }

export type Playback = { stop(): void }

let preparedContext: AudioContext | undefined

/**
 * Plays `notes`, such as "C#4", on a piano at one note per beat. `onNote` is
 * called with each note's position as it sounds, and with nothing once the
 * last one has finished or playback is stopped.
 */
export async function playNotes(
  context: AudioContext,
  notes: readonly string[],
  bpm: number,
  onNote: (position: number | undefined) => void,
): Promise<Playback> {
  if (preparedContext !== context) {
    setAudioContext(context)
    await samples({ piano: pianoSamples })
    preparedContext = context
  }
  // Superdough skips a note whose sample is still loading when it's due.
  await Promise.all(
    notes.map((note) => getSampleBuffer({ note }, pianoSamples)),
  )

  const timers = new Set<number>()
  const at = (time: number, action: () => void) => {
    const delayMs = Math.max(0, time - context.currentTime) * 1000
    const timer = window.setTimeout(() => {
      timers.delete(timer)
      action()
    }, delayMs)
    timers.add(timer)
  }

  const cyclist = new Cyclist<Step>({
    getTime: () => context.currentTime,
    onTrigger: (hap, _deadline, duration, cps, time) => {
      const { position, ...sound } = hap.value
      void superdough(sound, time, duration, cps)
      at(time, () => onNote(position))
      if (position === notes.length - 1) {
        at(time + duration, stop)
      }
    },
  })

  const stop = () => {
    cyclist.stop()
    for (const timer of timers) {
      window.clearTimeout(timer)
    }
    timers.clear()
    onNote(undefined)
  }

  // Every note plays in the first cycle. The silent one after it leaves time
  // to stop before the notes would come round again.
  const steps = notes.map(
    (note, position): Step => ({ s: "piano", note, release, position }),
  )
  cyclist.setCps(bpm / 60 / notes.length)
  await cyclist.setPattern(cat(sequence(...steps), silence), true)

  return { stop }
}
