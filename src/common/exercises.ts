export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const
export type NoteName = (typeof NOTE_NAMES)[number]

export type Finger = 1 | 2 | 3 | 4 | 5
export type ExerciseType = "scale" | "arpeggio"
export type Hand = "right" | "left"

export type Exercise = {
  id: string
  type: ExerciseType
  title: string
  tonic: NoteName
  quality: string
  notes: readonly NoteName[]
  fingering: Record<Hand, readonly Finger[]>
  description?: string
}

const majorScaleFingering = {
  right: [1, 2, 3, 1, 2, 3, 4, 5],
  left: [5, 4, 3, 2, 1, 3, 2, 1],
} as const satisfies Record<Hand, readonly Finger[]>

const minorScaleFingering = majorScaleFingering

const arpeggioFingering = {
  right: [1, 2, 3, 5],
  left: [5, 3, 2, 1],
} as const satisfies Record<Hand, readonly Finger[]>

export const exercises = [
  scale(
    "a-major-scale",
    "A major scale",
    "A",
    "major",
    ["A", "B", "C#", "D", "E", "F#", "G#", "A"],
    majorScaleFingering,
  ),
  scale(
    "b-major-scale",
    "B major scale",
    "B",
    "major",
    ["B", "C#", "D#", "E", "F#", "G#", "A#", "B"],
    majorScaleFingering,
  ),
  scale(
    "c-major-scale",
    "C major scale",
    "C",
    "major",
    ["C", "D", "E", "F", "G", "A", "B", "C"],
    majorScaleFingering,
  ),
  scale(
    "d-major-scale",
    "D major scale",
    "D",
    "major",
    ["D", "E", "F#", "G", "A", "B", "C#", "D"],
    majorScaleFingering,
  ),
  scale(
    "e-major-scale",
    "E major scale",
    "E",
    "major",
    ["E", "F#", "G#", "A", "B", "C#", "D#", "E"],
    majorScaleFingering,
  ),
  scale(
    "f-major-scale",
    "F major scale",
    "F",
    "major",
    ["F", "G", "A", "A#", "C", "D", "E", "F"],
    majorScaleFingering,
  ),
  scale(
    "g-major-scale",
    "G major scale",
    "G",
    "major",
    ["G", "A", "B", "C", "D", "E", "F#", "G"],
    majorScaleFingering,
  ),
  scale(
    "a-minor-scale",
    "A minor scale",
    "A",
    "minor",
    ["A", "B", "C", "D", "E", "F", "G", "A"],
    minorScaleFingering,
  ),
  scale(
    "b-minor-scale",
    "B minor scale",
    "B",
    "minor",
    ["B", "C#", "D", "E", "F#", "G", "A", "B"],
    minorScaleFingering,
  ),
  scale(
    "c-minor-scale",
    "C minor scale",
    "C",
    "minor",
    ["C", "D", "D#", "F", "G", "G#", "A#", "C"],
    minorScaleFingering,
  ),
  scale(
    "d-minor-scale",
    "D minor scale",
    "D",
    "minor",
    ["D", "E", "F", "G", "A", "A#", "C", "D"],
    minorScaleFingering,
  ),
  scale(
    "e-minor-scale",
    "E minor scale",
    "E",
    "minor",
    ["E", "F#", "G", "A", "B", "C", "D", "E"],
    minorScaleFingering,
  ),
  scale(
    "f-minor-scale",
    "F minor scale",
    "F",
    "minor",
    ["F", "G", "G#", "A#", "C", "C#", "D#", "F"],
    minorScaleFingering,
  ),
  scale(
    "g-minor-scale",
    "G minor scale",
    "G",
    "minor",
    ["G", "A", "A#", "C", "D", "D#", "F", "G"],
    minorScaleFingering,
  ),
  arpeggio("a-major-arpeggio", "A major arpeggio", "A", "major", [
    "A",
    "C#",
    "E",
    "A",
  ]),
  arpeggio("b-major-arpeggio", "B major arpeggio", "B", "major", [
    "B",
    "D#",
    "F#",
    "B",
  ]),
  arpeggio("c-major-arpeggio", "C major arpeggio", "C", "major", [
    "C",
    "E",
    "G",
    "C",
  ]),
  arpeggio("d-major-arpeggio", "D major arpeggio", "D", "major", [
    "D",
    "F#",
    "A",
    "D",
  ]),
  arpeggio("e-major-arpeggio", "E major arpeggio", "E", "major", [
    "E",
    "G#",
    "B",
    "E",
  ]),
  arpeggio("f-major-arpeggio", "F major arpeggio", "F", "major", [
    "F",
    "A",
    "C",
    "F",
  ]),
  arpeggio("g-major-arpeggio", "G major arpeggio", "G", "major", [
    "G",
    "B",
    "D",
    "G",
  ]),
  arpeggio("a-minor-arpeggio", "A minor arpeggio", "A", "minor", [
    "A",
    "C",
    "E",
    "A",
  ]),
  arpeggio("b-minor-arpeggio", "B minor arpeggio", "B", "minor", [
    "B",
    "D",
    "F#",
    "B",
  ]),
  arpeggio("c-minor-arpeggio", "C minor arpeggio", "C", "minor", [
    "C",
    "D#",
    "G",
    "C",
  ]),
  arpeggio("d-minor-arpeggio", "D minor arpeggio", "D", "minor", [
    "D",
    "F",
    "A",
    "D",
  ]),
  arpeggio("e-minor-arpeggio", "E minor arpeggio", "E", "minor", [
    "E",
    "G",
    "B",
    "E",
  ]),
  arpeggio("f-minor-arpeggio", "F minor arpeggio", "F", "minor", [
    "F",
    "G#",
    "C",
    "F",
  ]),
  arpeggio("g-minor-arpeggio", "G minor arpeggio", "G", "minor", [
    "G",
    "A#",
    "D",
    "G",
  ]),
] as const satisfies readonly Exercise[]

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((exercise) => exercise.id === id)
}

function scale(
  id: string,
  title: string,
  tonic: NoteName,
  quality: string,
  notes: readonly NoteName[],
  fingering: Record<Hand, readonly Finger[]>,
): Exercise {
  return {
    id,
    type: "scale",
    title,
    tonic,
    quality,
    notes,
    fingering,
    description:
      "Practice evenly with relaxed hand shape before increasing the tempo.",
  }
}

function arpeggio(
  id: string,
  title: string,
  tonic: NoteName,
  quality: string,
  notes: readonly NoteName[],
): Exercise {
  return {
    id,
    type: "arpeggio",
    title,
    tonic,
    quality,
    notes,
    fingering: arpeggioFingering,
    description:
      "Keep the wrist loose and listen for an even chord-tone shape.",
  }
}
