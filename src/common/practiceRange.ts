import {
  type Exercise,
  type Finger,
  type Hand,
  NOTE_NAMES,
  type NoteName,
} from "./exercises.ts"
import type { Clef } from "./sightReading.ts"

export type PracticeRange = 1 | 2

export type DerivedPractice = {
  label: string
  notes: readonly NoteName[]
  fingering: readonly Finger[]
  keyIds: readonly string[]
  clef: Clef
  baseOctave: number
}

const twoOctaveFingering = {
  scale: {
    right: [1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1],
  },
  arpeggio: {
    right: [1, 2, 3, 1, 2, 3, 5],
    left: [5, 3, 2, 1, 3, 2, 1],
  },
} as const satisfies Record<Exercise["type"], Record<Hand, readonly Finger[]>>

// MIDI pitch of each clef's middle staff line (treble B4, bass D3). Centering the
// run on this line splits the unavoidable ledger lines evenly above and below
// instead of stacking them on one side
const STAFF_CENTER_MIDI: Record<Clef, number> = { treble: 71, bass: 50 }

export function derivePracticeRange(
  exercise: Exercise,
  hand: Hand,
  range: PracticeRange,
): DerivedPractice {
  const clef: Clef = hand === "left" ? "bass" : "treble"
  const notes = range === 1 ? exercise.notes : expandSequence(exercise.notes)
  const fingering =
    range === 1
      ? exercise.fingering[hand]
      : twoOctaveFingering[exercise.type][hand]
  const baseOctave = centeredBaseOctave(notes, clef)

  return {
    label: range === 1 ? "1 octave" : "2 octaves",
    notes,
    fingering,
    keyIds: deriveKeyIds(notes, baseOctave),
    clef,
    baseOctave,
  }
}

function expandSequence<T>(sequence: readonly T[]): readonly T[] {
  const tail = sequence.slice(1)
  return [...sequence, ...tail]
}

// Walk the sequence at a reference octave (0) to get its pitch extent in
// semitones, then shift it so its midpoint lands on the clef's centre line.
function centeredBaseOctave(notes: readonly NoteName[], clef: Clef): number {
  let octave = 0
  let previousNoteIndex = -1
  let min = Infinity
  let max = -Infinity

  for (const note of notes) {
    const noteIndex = NOTE_NAMES.indexOf(note)
    if (previousNoteIndex >= 0 && noteIndex <= previousNoteIndex) octave += 1
    previousNoteIndex = noteIndex
    const semitones = octave * 12 + noteIndex
    min = Math.min(min, semitones)
    max = Math.max(max, semitones)
  }

  // octave offset 0 maps to MIDI (base + 1) * 12, so solve for base from the midpoint.
  return Math.round((STAFF_CENTER_MIDI[clef] - (min + max) / 2) / 12) - 1
}

function deriveKeyIds(
  notes: readonly NoteName[],
  baseOctave: number,
): readonly string[] {
  let octave = baseOctave
  let previousNoteIndex = -1

  return notes.map((note) => {
    const noteIndex = NOTE_NAMES.indexOf(note)

    if (previousNoteIndex >= 0 && noteIndex <= previousNoteIndex) {
      octave += 1
    }

    previousNoteIndex = noteIndex
    return `${note}${octave}`
  })
}
